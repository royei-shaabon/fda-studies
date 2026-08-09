import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config({ path: "../.env" });

// יצירת client של Anthropic.
// ה-API key נלקח מקובץ ה-.env כדי שלא נכתוב אותו ישירות בתוך הקוד.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});


// מגדיר איך מוצר במערכת שלנו צריך להיראות.
interface Product {
  name: string;
  price: number;
  discountPercent: number;
}


// מגדיר את שתי האפשרויות שיכולות לחזור מחיפוש מוצר:
//
// 1. המוצר נמצא -> found: true + המוצר עצמו
// 2. המוצר לא נמצא -> found: false + הודעת שגיאה
//
// זה נקרא discriminated union כי אפשר לדעת לפי found
// איזה מבנה קיבלנו.
type LookupProductResult =
  | {
      found: true;
      product: Product;
    }
  | {
      found: false;
      message: string;
    };


// מאגר המוצרים שלנו.
//
// Record<string, Product> אומר:
// כל key הוא string, וכל value חייב להיות Product.
//
// לדוגמה:
// "B456" -> המוצר apple
const products: Record<string, Product> = {
  A123: { price: 12, name: "banana", discountPercent: 0 },
  B456: { price: 6, name: "apple", discountPercent: 25 },
  B457: { price: 14, name: "melon", discountPercent: 15 },
  B458: { price: 8, name: "peach", discountPercent: 10 },
};


// Tool אמיתי ראשון:
//
// מקבל productId ומנסה למצוא אותו במאגר שלנו.
function lookupProduct(productId: string): LookupProductResult {
  const product = products[productId];

  // אם לא נמצא מוצר תחת ה-ID הזה,
  // מחזירים תשובה מסודרת ולא ממציאים מוצר.
  if (!product) {
    return {
      found: false,
      message: "Product not found",
    };
  }

  // אם נמצא - מחזירים את המוצר.
  return {
    found: true,
    product,
  };
}


// Tool אמיתי שני:
//
// מקבל מחיר מקורי ואחוז הנחה,
// ומחשב את המחיר הסופי.
function calculateDiscount(
  originalPrice: number,
  discountPercent: number
): number {
 return originalPrice * (1 - discountPercent / 100);
}


// זו לא הפונקציה עצמה.
//
// זה ה-SCHEMA שאנחנו שולחים למודל כדי להסביר לו
// שקיים tool בשם lookup_product,
// מה הוא עושה ואיזה input מותר לו לשלוח אליו.
const lookupProductTool: Anthropic.Messages.Tool = {
  name: "lookup_product",

  description:
    "Look up product details by product ID. Use this whenever product information is needed. Never guess product details.",

  input_schema: {
    type: "object",

    properties: {
      productId: {
        type: "string",
        description: "The product SKU.",
      },
    },

    // אומר למודל ש-productId הוא שדה חובה.
    required: ["productId"],
  },
};


// ה-SCHEMA של כלי חישוב ההנחה.
//
// שוב: זה רק התיאור של הכלי עבור המודל,
// לא הפונקציה calculateDiscount עצמה.
const calculateDiscountTool: Anthropic.Messages.Tool = {
  name: "calculate_discount",

  description:
    "Calculate a product's final price from its original price and discount percentage. Never guess missing values.",

  input_schema: {
    type: "object",

    properties: {
      originalPrice: {
        type: "number",
      },

      discountPercent: {
        type: "number",
      },
    },

    required: ["originalPrice", "discountPercent"],
  },
};


// הוראות ההתנהגות של המודל.
//
// כאן אנחנו מגדירים גם את סדר העבודה:
// אם צריך מחיר אחרי הנחה,
// קודם לחפש את המוצר ורק אחר כך לחשב.
//
// חשוב: אנחנו אומרים במפורש למודל
// לא לחשב לבד ולא להמציא נתונים.
const systemPrompt = `
You are a product assistant.

Use lookup_product whenever product information is needed.

If the user asks for a final price after discount:

1. First use lookup_product.
2. If the product exists, use calculate_discount with the exact returned price and discountPercent.
3. Never calculate the discount yourself.
4. Never guess product information.

If the product does not exist, tell the user to contact the shift manager.
`;


// זו הפונקציה המרכזית של התרגיל.
//
// היא מנהלת את ה-tool-use loop:
// User -> Model -> Tool -> Model -> Tool -> Model...
//
// בסוף היא מחזירה string עם התשובה הסופית של המודל.
async function runWithTools(
  userMessage: string
): Promise<string> {

  // מתחילים את ה-history עם ההודעה הראשונה של המשתמש.
  let messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];


  // שולחים את ההודעה הראשונה למודל.
  //
  // בנוסף ל-messages אנחנו שולחים:
  // - system prompt
  // - רשימת tools שהמודל רשאי לבקש
  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: systemPrompt,
    tools: [lookupProductTool, calculateDiscountTool],
    messages,
  });


  // מונה כמה סבבים של tool calls כבר ביצענו.
  //
  // הוא משמש כ-safety guard כדי שה-agent
  // לא ייכנס בטעות ללולאה אינסופית.
  let toolCalls = 0;


  // אם Claude עצר בגלל שהוא רוצה להשתמש ב-tool,
  // אנחנו נכנסים ללולאה.
  //
  // כל עוד stop_reason הוא tool_use,
  // עדיין אין לנו בהכרח תשובה סופית למשתמש.
  while (response.stop_reason === "tool_use") {

    toolCalls++;


    // הגנה מפני agent שנתקע בלולאה
    // וממשיך להזמין tools שוב ושוב.
    if (toolCalls > 5) {
      throw new Error("Too many tool calls");
    }


    // response.content יכול להכיל כמה blocks.
    //
    // אנחנו רוצים רק את אלו מסוג tool_use.
    //
    // משתמשים ב-filter ולא ב-find,
    // כי המודל יכול לבקש יותר מ-tool אחד באותו response.
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === "tool_use"
    );

    // אם stop_reason אמר tool_use,
    // אבל בפועל לא מצאנו אף tool_use block,
    // משהו לא תקין בתגובה.
    if (toolUseBlocks.length === 0) {
      throw new Error("Tool use block not found");
    }


    // כאן נצבור את כל התוצאות של הכלים
    // שהמודל ביקש בסבב הנוכחי.
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];


    // עוברים אחד-אחד על כל tool שהמודל ביקש.
    for (const toolUseBlock of toolUseBlocks) {

      // עדיין לא יודעים מה יהיה סוג התוצאה,
      // כי כל tool יכול להחזיר משהו אחר.
      let toolResult: unknown;


      // אם המודל ביקש lookup_product...
      if (toolUseBlock.name === "lookup_product") {

        // input מגיע מהמודל ולכן אסור לסמוך עליו אוטומטית.
        const input = toolUseBlock.input;


        // Runtime validation:
        //
        // בודקים שה-input:
        // 1. לא null
        // 2. הוא object
        // 3. מכיל productId
        // 4. productId הוא באמת string
        if (
          input !== null &&
          typeof input === "object" &&
          "productId" in input &&
          typeof input.productId === "string"
        ) {

          // רק אחרי שה-input עבר validation
          // מריצים את הפונקציה האמיתית.
          try {
            toolResult = lookupProduct(input.productId);
          } catch (error) {
                if (error instanceof Error) {
                    toolResult = {
                        error: true,
                        message: error.message
                    }
                } else {
                    toolResult = {
                    error: true,
                    message: "Unknown tool execution error",
                    };
                }
            }
        }
      }


      // אם המודל ביקש calculate_discount...
      if (toolUseBlock.name === "calculate_discount") {

        const input = toolUseBlock.input;


        // גם כאן עושים runtime validation,
        // כי הנתונים הגיעו מבחוץ.
        if (
          input !== null &&
          typeof input === "object" &&

          "originalPrice" in input &&
          "discountPercent" in input &&

          typeof input.originalPrice === "number" &&
          typeof input.discountPercent === "number" &&

          // typeof NaN הוא גם "number",
          // ולכן Number.isFinite בודק שמדובר במספר אמיתי ושימושי.
          Number.isFinite(input.originalPrice) &&
          Number.isFinite(input.discountPercent) &&

          // מחיר לא יכול להיות שלילי.
          input.originalPrice >= 0
        ){ if(// אחוז הנחה חייב להיות בין 0 ל-100.
            input.discountPercent < 0 ||
            input.discountPercent > 100){
                toolResult = {
                error: true,
                message: `discountPercent must be between 0 and 100, received ${input.discountPercent}`
            };
        } else{
            try {
            toolResult = calculateDiscount(
                        input.originalPrice,
                        input.discountPercent
                    );
            } catch (error) {
                    if (error instanceof Error) {
                        toolResult = {
                            error: true,
                            message: error.message
                        }
                    } else {
                        toolResult = {
                        error: true,
                        message: "Unknown tool execution error",
                        };
                    }
            }
            
        }
        }
      }


      // אם אף אחד מה-tools לא רץ,
      // כנראה שקיבלנו input לא חוקי
      // או שם של tool שאנחנו לא תומכים בו.
      if (toolResult === undefined) {
        toolResult = {
            error: true,
            message: `Invalid input or unsupported tool: ${toolUseBlock.name}`
        };
      }


      // מחזירים למודל את התוצאה של ה-tool.
      //
      // tool_use_id חשוב מאוד:
      // הוא מחבר בין בקשת ה-tool של המודל
      // לבין התוצאה שאנחנו מחזירים לו.
      //
      // JSON.stringify הופך את התוצאה ל-string.
      if (
            typeof toolResult === "object" &&
            toolResult !== null &&
            "error" in toolResult &&
            toolResult.error === true
        ) {
            toolResults.push({
                type: "tool_result",
                tool_use_id: toolUseBlock.id,
                content: JSON.stringify(toolResult),
                is_error: true
            });
        } else{
            toolResults.push({
                type: "tool_result",
                tool_use_id: toolUseBlock.id,
                content: JSON.stringify(toolResult),
            });
        }
        
    }

    // מוסיפים להיסטוריית השיחה:
    //
    // 1. את התגובה שבה המודל ביקש tools
    // 2. את התוצאות שקיבלנו מהרצת אותם tools
    //
    // כך המודל יודע מה קרה בסבב הקודם.
    messages = [
      ...messages,

      {
        role: "assistant",
        content: response.content,
      },

      {
        role: "user",
        content: toolResults,
      },
    ];


    // עכשיו שולחים שוב את כל ההיסטוריה למודל.
    //
    // המודל רואה את תוצאת ה-tool ויכול:
    // - לתת תשובה סופית
    // - או לבקש tool נוסף
    //
    // אם יבקש tool נוסף,
    // ה-while ירוץ שוב.
    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      system: systemPrompt,
      tools: [lookupProductTool, calculateDiscountTool],
      messages,
    });
  }


  // יצאנו מה-while,
  // כלומר המודל כבר לא ביקש tool נוסף.
  //
  // עכשיו מחפשים את בלוק הטקסט
  // שמכיל את התשובה הסופית למשתמש.
  const textBlock = response.content.find(
    (block): block is Anthropic.Messages.TextBlock =>
      block.type === "text"
  );


  // אם משום מה אין תשובת text,
  // אנחנו לא יכולים להחזיר תשובה תקינה.
  if (!textBlock) {
    throw new Error("Text block not found");
  }


  // מחזירים את הטקסט הסופי של Claude.
  return textBlock.text;
}


// מפעילים את כל ה-agent flow.
//
// שים לב:
// אנחנו לא קוראים בעצמנו ל-lookupProduct או calculateDiscount.
//
// אנחנו רק שולחים בקשה למודל.
// המודל מחליט איזה tool לבקש,
// וה-runWithTools מטפל בבקשות שלו.
runWithTools(
  "What is the final price of product B456 after its discount?"
)
  .then(console.log)
  .catch(console.error);