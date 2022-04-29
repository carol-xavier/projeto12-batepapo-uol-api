import express, { json } from 'express';
import { MongoClient } from 'mongodb';
import Joi from 'joi';
import cors from 'cors';
import dotenv from "dotenv";
import dayjs from 'dayjs'
dotenv.config();

//USER pode ser uma variável global??

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

app.post("/participants", async (req, res) => {
    const { name } = req.body;
    const time = dayjs().format('hh:mm:ss');
    let stop;

    const scheme = Joi.object().keys({
        name: Joi.string().min(1).required()
    });
    const result = scheme.validate({name});
    const { error } = result; 
    const valid = error == null;

    if (!valid) {
        res.status(422).send('Nome é obrigatório');
        return;
    }

    const arrUsers = await db.collection("uolUsers").find({}).toArray();
    arrUsers.map(user => {
        if(user.name === name){
            stop = "stop";
            res.status(409).send("Nome em uso. Escolha outro nome");
            return;
        }
    });

    if(stop) return;
    addUser(name,time, res);
});

function addUser(name,time, res){
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
    promise.then(async () => {
        await db.collection("uolMessages").insertOne(status);
        res.sendStatus(201);
    });
    promise.catch(() => res.sendStatus(500));
};

app.get('/participants', (req, res) => {
    db.collection("uolUsers").find({}).toArray().then(users => res.send(users));
});

app.post('/messages', (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;
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

app.get('/messages', (req, res) => {
    const { limit } = req.query;
    const { user } = req.headers;

    const promise = db.collection("uolMessages").find({}).toArray();
    promise.then((messages) => {
        const filteredMsgs = messages.filter(msg => msg.to === user || msg.to === "Todos" || msg.from === user);

        if (!limit) res.send(filteredMsgs);

        if (limit) {
            const lastMessages = filteredMsgs.slice(filteredMsgs.length - limit);
            res.send(lastMessages);
        }
    }); 
});

app.post('/status', async (req, res) => {
    const { user } = req.headers;

    try {
        const usersCollection = db.collection("uolUsers");
        const participant = await usersCollection.findOne({name: user});
        if(!participant){
			res.sendStatus(404)
			return;
		}
        await usersCollection.updateOne({ 
            _id: participant._id 
        }, { $set: {lastStatus: Date.now()}
        });
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500);
    }    
});

setInterval(() => {
    const now = Date.now();

    const promise = db.collection("uolUsers").find().toArray();
    promise.then(users => {
        users.map((user) => {
            if (now - user.lastStatus > 10000){
                 deleteUser(user)
            };
        });
    });
    // promise.catch(console.log("DEU RUIM"));
}, 15000);

async function deleteUser(user) {
    try {
        const usersCollection = db.collection("uolUsers");
        await usersCollection.deleteOne({ name: user.name });
        const msgCollection = db.collection("uolMessages");
        const statusOff = {
            from: user.name,
            to: "Todos",
            text: 'sai da sala...', 
            type: 'status', 
            time: dayjs().format("hh:mm:ss")
        }
        await msgCollection.insterOne(statusOff);
    } catch (error) {
        console.log("ERRO"); //DEIXO ESSE CONSOLE.LOG??
    }
};

app.listen(5000);


