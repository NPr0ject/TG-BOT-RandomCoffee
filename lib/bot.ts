import { Bot, Context } from "https://deno.land/x/grammy@v1.32.0/mod.ts";
import { menuKeyboard, yesOrNo } from "./keyboards.ts"; // импорт клавиатур
import { getProfile, reviewProfile, setState, getSimularUsers } from "./functions.ts"; //импорт функций
//import { createClient } from "npm:@supabase/supabase-js"; // database
import { UserInfo } from "./interfaces.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const supabase = createClient(
  Deno.env.get("https://goscxscwzyizqwwwiyxe.supabase.co")!,
  Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvc2N4c2N3enlpenF3d3dpeXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2ODkwMDYsImV4cCI6MjA0OTI2NTAwNn0.WmLJMzxmMvdF8T9Gncd1L6oem0d7C6ZtHVTKIqzdviw")!,
);
/* инициализация supabase
const supabaseUrl = "https://goscxscwzyizqwwwiyxe.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);
export const users = supabase.from("users");*/ // выпелил тк нашёл что подругому объявляется эта сука

//объявил бота
export const bot = new Bot<Context>(Deno.env.get("BOT_TOKEN") || "7864266027:AAGJL9Dm7MK-GrBj_iRoTd_3wE1u5q-_lZw"); // тут дописать

// локальная информация о пользователе
export const info: UserInfo = {
  id: 0,
  name: "",
  age: 0,
  interests: [], // поменять  в интерфейсе
  time: 0,// меняем 
  coffee: 0, // меняем и создаём
  state: "",
  done: false,
};

// info будет нужна для сохранения инфо пользователя в бд (или получения) - представляет из себя набор данных о пользователе
bot.command("start", async (ctx) => { // бот получает команду /start
  info.id = Number(ctx.msg.from?.id);
  if (await getProfile()) {
    await ctx.reply(`Привет, ${info.name}!`, { reply_markup: menuKeyboard });
  } else {
    await users.insert({
      tg_id: info.id,
      state: "setName",
    });
    await ctx.reply(
      "Йоу, чё как?! \nТы тут в первый раз. Тогда поясню. \nЯ бот, который поможет завести новые знакомства, встретиться, пообщатся. Ты не против? \nТогда начнём",
    );
    await ctx.reply(
      "Звать то тебя как? А прозвище то есть?",
      //{ parse_mode: "HTML" }, // нужно, чтобы использовать теги из html // а я не понял
    );
    setState("setName"); // следующим сообщением боту должно придти имя
  }
});

// Команда /like
bot.command("like", async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Если собеседника еще не оценивали то создаем запись
    if (!ratings[userId]) {
        ratings[userId] = { likes: 0, dislikes: 0 };
    }

    // Увеличиваем счетчик "нравится"
    ratings[userId].likes += 1;

    await ctx.reply("Спасибо! Тебе понравился собеседник. 👍");
});

// Команда /dislike
bot.command("dislike", async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    // Если собеседника еще не оценивали то создаем запись
    if (!ratings[userId]) {
        ratings[userId] = { likes: 0, dislikes: 0 };
    }

   // Увеличиваем счетчик "не нравится"
    ratings[userId].dislikes += 1;

    await ctx.reply("Спасибо! Тебе не нравится собеседник. 👎");
});

// Команда /stats для получения статистики оценок
bot.command("stats", async (ctx) => {
    const userId = ctx.from?.id.toString();
    const userRatings = ratings[userId] || { likes: 0, dislikes: 0 };
    const response = `Статистика: Нравится: ${userRatings.likes}, Не нравится: ${userRatings.dislikes}`;
    await ctx.reply(response);
});

// обработка подтверждения интересов
bot.callbackQuery("interestsDone", async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply("Отлично!");
  await reviewProfile(ctx);
});
bot.callbackQuery("interestsNotDone", async (ctx) => {
  await ctx.deleteMessage();
  await ctx.reply("Хорошо, напиши еще увлечений!");
  setState("setInterests");
});

bot.hears(
  ["профиль", "Профиль", "Мой профиль", "Мой профиль 👤"],
  async (ctx) => {
    await reviewProfile(ctx);
  },
);

bot.on("message", async (ctx) => {
  if (info.state) { // при непустом info.state
    switch (info.state) {
      case "setName":
        if (
          typeof ctx.msg.text !== "string" ||
          /[0-9_.*^%$#@!]/.test(ctx.msg.text) // регулярное выражение на проверку спец символов
        ) {
          await ctx.reply(
            "Косяк! Имя не должно содержать числа и символы",
          );
          return;
        } else {
          info.name = ctx.msg.text || ""; //сохраняем в переменную
          await ctx.reply("Ну, проходи тогда,  " + info.name + "!");
          await ctx.reply("Сколько лет то тебе?");
          setState("setAge");
        }
        break;

      case "setAge":
        if (isNaN(Number(ctx.msg.text))) {
          await ctx.reply("Напиши возраст циферками)))");
          return;
        }
        info.age = Number(ctx.msg.text);
        await ctx.reply(
          await ctx.reply("Выбери кофейню по душе! \n 1 -Скуратов. 70 лет Октября, 7. \n 2 Скуратов. Мира, 7А. \n  3 -Скуратов. Красный Путь, 63. \n 4 - Скуратов. Иртышская Набережная, 30. \n 5 - Энитайм. Лобкова, 6/1.")//"Круто! напиши свои интересы ЧЕРЕЗ запятую",
        );
        setState("setCoffee");
        break;
        
        case "setCoffee":
        if(isNaN(Number(ctx.msg.text)) || Number(ctx.msg.text) > 5){
          await ctx.reply("Чёт я тебя не понял|-1-|");
          return;
        }
        info.coffee = Number(ctx.msg.text);
        await ctx.reply(
          "Хорошо! а теперь скажи мне время в которое тебе удобно",//"Хорошо! Твоя анкета создана! Жди новых сообщений с предложением попить кофейку!",
        );
        await ctx.reply(
          "PS: напиши только час в 24-часовой системе",/
        );
        setState("setTime");
        break;

        case "setTime":
        if(isNaN(Number(ctx.msg.text)) || Number(ctx.msg.text) > 24){
          await ctx.reply("Чёт я тебя не понял|-1-|");
          return;
        }
        await ctx.reply("Принял. Только ты не опаздывай) \n тепеь Напиши свои интересы ЧЕРЕЗ ЗАПЯТУЮ");
        setState("setInterests")
        break;


        
        case "setInterests":
        if (ctx.msg.text) {
          for (const interest of ctx.msg.text?.split(",")) {
            info.interests.push(interest.trim());
          }
        }
        await ctx.reply(
          "Вот это твои интересы:",
        );
        await ctx.reply(
          info.interests.toString(),
        );
        await ctx.reply("Интересно конечно. Это всё??", { reply_markup: yesOrNo }); // смотри bot.callbackQuery
        break;

      case "review":
        switch (ctx.msg.text) {
          case "Да!":
            info.done = true;
            await ctx.reply("Отлично!");
            const {data, error} = await users.update({
              name: info.name,
              age: info.age,
              lat: info.lat,
              long: info.long,
              time: info.time,
              interests: info.interests,
              done: info.done,
            }).eq("tg_id", info.id).single();
            console.log(data, error)
            setState("searching")
            break;

          case "Нет, хочу изменить":
            setState("setName");
            await ctx.reply("Давайте начнем сначала! Как тебя звать?");
            info.interests = [];
            break;

          default:
            await ctx.reply("Выберай. Синяя или Красная"); // я не понял
            break;
        }
        break;
        
      default:
        break;
    }
  }
});
// пу пу пу
//скажем что хуйня
while (info.state == "searching") {
  setInterval(async ()=>{
    const users = await getSimularUsers()
    if (users.length>0) {
      console.log("ого")
    }
  }, 10000)
}
