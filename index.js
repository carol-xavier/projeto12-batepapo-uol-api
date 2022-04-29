import express, { json } from 'express';
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

// setInterval(() => {
//     const now = Date.now();
//     const time = dayjs().format("hh:mm:ss");

//     const promise = db.collection("uolUsers").find().toArray();
//     promise.then(users => {
//         const usersCollection = db.collection("uolUsers");
//         users.map((user,index) => {
//             if(now - user.lastStatus > 10000){
//                 usersCollection.deleteOne({ _id: new ObjectId(index)}).then(() => {
//                     console.log(usersCollection,"DEVE ESTAR DELETANDO");
//                     const statusOff = {
//                         from: user.name, 
//                         to: 'Todos', 
//                         text: 'sai da sala...', 
//                         type: 'status', 
//                         time
//                     };
//                     db.collection("uolMessages").insertOne(statusOff).then(() => console.log(statusOff,"DEVE TER ENVIADO A MSG"));
//                 })
//             }
//         })
//     });
//     promise.catch(console.log("DEU RUIM"));
// }, 15000);


app.post("/participants", (req, res) => {
    const { name } = req.body;
    const time = dayjs().format('hh:mm:ss');

    if (name === "") {
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
        const filteredMsgs = messages.filter(msg => msg.to === user || msg.to === "todos" || msg.from === user);

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
    promise.catch(console.log("DEU RUIM"));
}, 50000);

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
        console.log("ENVIOU STATUSOFF")
    } catch (error) {
        console.log("ERRO");
    }
};

app.listen(5000);


