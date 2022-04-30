import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongo from './utils';

import {json} from 'express';
import {messageSchema, nameSchema} from './schemas';
import {Message, Participant} from './entities';
import {existsParticipant, getMessages, getParticipants} from './utils';

dotenv.config();

const app = express();

app.use(cors(), json());

const port = process.env.PORT || 5000;
app.listen(port, () => 
    console.log(`O servidor está escutando na porta https://localhost:${port}`)
)

app.post('/participants', async (req,res) => {
    
    const {name} = req.body;
    const validation = nameSchema.validate({name}, {abortEarly: true});
    if (validation.error) {
        return res.sendStatus(402);
    }
    try {
        await mongo.connect();
        const participants = getParticipants();
        const messages = getMessages();

        if (await existsParticipant(participants, name)) {
            mongo.close();
            return res.sendStatus(409);
        }

        await participants.insertOne(new Participant(name));
        await messages.insertOne(
            new Message(name,'Todos','entra na sala...','status')
        );
        res.sendStatus(201);
    } catch(e) {
        res.sendStatus(500);
    } finally {
        mongo.close();
    }
})

app.get('/participants', async (_,res) => {

    try {
        await mongo.connect();
        const participants = await getParticipants().find().toArray();
        res.status(201).send(participants);
    } catch (e) {
        res.sendStatus(500);
    } finally {
        mongo.close();
    }
})

app.post('/messages', async (req,res) => {

    const {to,text,type} = req.body;
    const {user: from} = req.headers;
    let message: Message;
    if (typeof from === 'string') {
        const validation = messageSchema.validate(
            {from,to,text,type}, 
            {abortEarly:true}
        );
        if (validation.error) {
            return res.sendStatus(422);
        } else {
            message = new Message(from, to, text, type);
        }
    } else {
        return res.sendStatus(422);
    }
    try {
        await mongo.connect();
        const participants = getParticipants();
        const messages = getMessages();
        const size = await participants.estimatedDocumentCount();
        if (size === 0) {
            mongo.close();
            return res.sendStatus(422);
        } else {
            await messages.insertOne(message);
            res.sendStatus(201);
        }
    } catch (e) {
        res.sendStatus(500);
    } finally {
        mongo.close();
    }
});

app.get('/messages', async (req, res) => {

    const {user} = req.headers;
    const {limit} = req.query;
    try {
        await mongo.connect();
        const messages = getMessages();
        const conditions = {$or:[
            {from:user},
            {to:user},
            {to:'Todos'}
        ]};
        const userMessages = await messages.find(conditions).toArray();
        if (typeof limit === 'string') {
            const end = userMessages.length-1;
            const start = end-parseInt(limit);
            const result = userMessages.slice(start,end);
            res.status(201).send(result);
        } else {
            res.status(201).send(userMessages);
        }
    } catch (e) {
        res.sendStatus(500);
    } finally {
        mongo.close();
    }
});
