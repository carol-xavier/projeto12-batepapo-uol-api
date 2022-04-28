import express, {json} from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db = null;
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db("test");
    console.log("Seu DB está funcionando! YAY")
});

app.post("/participants", (req,res) => {
    const {name} = req.body;
    console.log(name, "Nome do Usuario");
    if(name === ""){
        res.status(422).send('Nome é obrigatório');
        return;
    }

    res.sendStatus(201);
});

app.listen(5000);