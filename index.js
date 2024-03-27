import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import enforce from 'express-sslify';
import * as ipfsClient from 'ipfs-http-client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5mb' }));
app.use(enforce.HTTPS({ trustProtoHeader: true }));
app.use(express.static(path.join(__dirname, ".", "build")));
app.use('/explorer', express.static(path.join(__dirname, 'explorer')));

const projectId = 'your_infura_projectId';
const projectSecret = 'your_infura_projectSecret'
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

const client = ipfsClient.create({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
    headers: {
        authorization: auth,
    },
});

async function createThumbnail(base64)
{
    let file = { path: 'thumb.png'};
    let image = base64.split(';base64,').pop();
    let buffer = Buffer.from(image, 'base64');
    return await client.add(buffer,file);;
};

async function createContent(content)
{
    let con = content;
    let file = { path: 'content.txt'};
    return await client.add(con,file);;
};

async function createMetadata(title,desc,contentLink,thumbnailLink,tag,creatorAddress)
{
    return await client.add(Buffer.from(
      JSON.stringify({
        name: title,
        description: desc,
        symbol: "typed",
        artifactUri: `ipfs://${contentLink}`,
        displayUri: `ipfs://${thumbnailLink}`,
        tags: tag,
        creators: [creatorAddress],
        formats: [{
            uri: `ipfs://${contentLink}`,
            mimeType: "text/plain",
        }, ],
        decimals: 0,
        thumbnailUri: `ipfs://${thumbnailLink}`,
        shouldPreferSymbol: false,
        isBooleanAmount: false,
      })
    ))
};

app.use("/ipfs", async function(req, res, next) {
    if ('POST' != req.method)
    {
        res.send("test");
    }
    else
    {
        var baslik = req.body.name;
        var adres = req.body.address;
        var icerik = req.body.content;
        var thumbnail = req.body.thumbnail;
        var tag = req.body.tag;
        try{
            const thumbnailPin =  await createThumbnail(thumbnail);
            const content = await createContent(icerik);
            const meta = await createMetadata(baslik,icerik,content.path,thumbnailPin.path,tag,adres);
            console.log(meta);
            res.send(meta.path);
        }catch(e){
            next(e);
        }
    }
})


app.use("/ipfs", express.static("public"));

app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, ".", "build", "index.html"));
});

// start express server on port 5000
app.listen(process.env.PORT || 5000, function() {
    console.log("Express server listening on port %d in %s mode");
});