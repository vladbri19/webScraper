const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const wordCount = require('word-count');
const PORT = process.env.port || 4000;

const sentimentLexic = {
    "good": 1,
    "joy": 1,
    "happiness": 1,
    "joyful": 1,
    "excellent": 1,
    "positive": 1,
    "bad": -1,
    "horrible": -1,
    "worst": -1,
    "negative": -1,
    "terrible": -1,
    "neutral": 0,
}
function analyzeS(text) {
    const words = text.toLowerCase().split(/\s+/);

    let sentimentScore = 0;

    words.forEach((word) => {
        if(sentimentLexic[word]){
            sentimentScore += sentimentLexic[word];
        }
    });

    if (sentimentScore > 0) {
        return "positive";
    } else if (sentimentScore < 0) {
        return "negative";
    } else {
        return "neutral";
    }
}

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
    res.render('index', {value: ''});
});

app.post('/scrape', (req, res) => {
    const urlToScrape = req.body.url;
    puppeteer.launch()
            .then(async function(browser){
                const page = await browser.newPage();

                await page.goto(urlToScrape);

                let titles = await page.evaluate(() => {
                    return  Array.from(document.body.querySelectorAll('.group > div > a'),(el)=>el.textContent);
                });

                let hrefs = await page.evaluate(() => {
                    return  Array.from(document.body.querySelectorAll('.group > div > a'),(el)=>el.href);
                });

                let shortDescriptions = await page.evaluate(() => {
                    return  Array.from(document.body.querySelectorAll('.group > div:nth-child(2)'),(el)=>el.textContent);
                });

                let auth_images = await page.evaluate(() => {
                    return  Array.from(document.body.querySelectorAll('img[alt="post.author.name"]'),(el)=>el.src);
                });

                const wordsCounter = [];
                const sentiments = [];

                for(const href of hrefs) {
                    await page.goto(href);

                    let bodyInnerText = await page.evaluate(() => {
                        return document.body.innerText
                    });

                    sentiments.push(analyzeS(bodyInnerText));
                    wordsCounter.push(wordCount(bodyInnerText));
                }

               // console.log(sentiments);

                const transformedData = [];

                for(let i = 0; i < titles.length; i++) {
                    transformedData.push({
                        title: titles[i],
                        short_description: shortDescriptions[i],
                        url: hrefs[i],
                        author_images: auth_images[i],
                        words: wordsCounter[i],
                        sentiment: sentiments[i]
                    });
                }



                await browser.close();

                res.render('index', { value:transformedData });



            }).catch((error) => {
        console.log(error);
             });
});

app.listen(PORT, () => {
   console.log(`server is running on PORT:${PORT}`);
});
