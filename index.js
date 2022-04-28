import express, {json} from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from "dotenv";
import dayjs from 'dayjs' 
dotenv.config();

const app = express();
app.use(json());
app.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db = null;
const promise = mongoClient.connect();
promise.then(() => {
    db = mongoClient.db("uol");
    console.log("Seu DB está funcionando! YAY")
});

app.post("/participants", (req,res) => {
    const {name} = req.body;
    const time = dayjs().format('hh:mm:ss');

    if(name === ""){
        res.status(422).send('Nome é obrigatório');
        return;
    }

    const user = {
        name,
        lastStatus: Date.now()
    }
    const status = {
        from: name, 
        to: 'Todos', 
        text: 'entra na sala...', 
        type: 'status', 
        time
    }
    const promise = db.collection("uolUsers").insertOne(user);
    promise.then(() => {
        const promiseTwo = db.collection("uolMessages").insertOne(status);
        promiseTwo.then(() => res.sendStatus(201));
    });
    promise.catch(() => res.sendStatus(500));
});

app.get('/participants', (req,res) => {
    db.collection("UolUsers").find({}).toArray().then(users => {
        res.send(users);
    });
})

app.listen(5000);