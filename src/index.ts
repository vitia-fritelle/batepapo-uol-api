import cors from 'cors';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import express from 'express';
import mongo from './utils';

import {json} from 'express';
import {nameSchema} from './schemas';
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

        await participants.insertOne(new Participant(name,Date.now()));
        await messages.insertOne(
            new Message(name,'Todos','entra na sala...','status',
            dayjs().format('HH:mm:ss'))
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
