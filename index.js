import express, {json} from 'express';
import { MongoClient } from 'mongodb';
import cors from 'cors';
import dotenv from "dotenv";
import dayjs from 'dayjs' 
dotenv.config();

//USER pode ser uma variável global???

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
    db.collection("uolUsers").find({}).toArray().then(users => res.send(users));
});

app.post('/messages', (req,res) => {
    const {to, text, type} = req.body;
    const {user} = req.headers;
    const time = dayjs().format('hh:mm:ss');

    const message = {
        from: user, 
        to, 
        text, 
        type, 
        time
    }
    const promise = db.collection("uolMessages").insertOne(message);
    promise.then(() => res.sendStatus(201));
    promise.catch(() => res.sendStatus(500));
});

app.get('/messages', (req,res) => {
    const {limit} = req.query;
    const {user} = req.headers;
  
    const promise = db.collection("uolMessages").find({}).toArray();
    promise.then((messages) => {
        const filteredMsgs = messages.filter(msg => msg.to === user || msg.to === "todos" || msg.from === user);

        if(!limit) res.send(filteredMsgs);

        if(limit){
            const lastMessages = filteredMsgs.slice(filteredMsgs.length - limit);
            res.send(lastMessages);
        }
    }); 
});

app.post('/status', (req,res) => {
    const {user} = req.headers;

    const promise = db.collection("uolUsers").find({name: user}).toArray();
    promise.then(user => {

        if(user.length === 0) res.sendStatus(404);
        
        if(user.length > 0){
            user[0].lastStatus = Date.now()
            res.sendStatus(200);
        }
    });
});


app.listen(5000);