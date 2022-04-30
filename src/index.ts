import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongo from './utils';

import {Message, Participant} from './entities';
import {json} from 'express';
import {messageSchema, nameSchema} from './schemas';
import {existsParticipant, getMessages, getParticipants, removeHTML} from './utils';

dotenv.config();

const app = express();

app.use(cors(), json());

const port = process.env.PORT || '5000';
app.listen(port, () => 
    console.log(`O servidor está escutando na porta https://localhost:${port}`)
);


app.post('/participants', async (req,res) => {
    
    const name = removeHTML(req.body.name).trim();
    const validation = nameSchema.validate({name}, {abortEarly: true});
    if (validation.error) {
        return res.sendStatus(422);
    } else {
        try {
            await mongo.connect();
            const participants = getParticipants();
            const messages = getMessages();
    
            if (await existsParticipant(participants, name)) {
                mongo.close();
                return res.sendStatus(409);
            } else {
                await participants.insertOne(new Participant(name));
                await messages.insertOne(
                    new Message(name,'Todos','entra na sala...','status')
                );
                res.sendStatus(201);
            }
        } catch(e) {
            res.sendStatus(500);
        } finally {
            mongo.close();
        }
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

    const {to,text,type} = {
        to:removeHTML(req.body.to).trim(),
        text:removeHTML(req.body.text).trim(),
        type:removeHTML(req.body.type).trim()
    };
    let from = req.headers.user;
    if (typeof from === 'string') {
        from = removeHTML(from).trim(); 
        const validation = messageSchema.validate(
            {from,to,text,type}, 
            {abortEarly:true}
        );
        if (validation.error) {
            return res.sendStatus(422);
        } else {
            const message = new Message(from, to, text, type);
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
        }
    } else {
        return res.sendStatus(422);
    }
});

app.get('/messages', async (req, res) => {

    let {user} = req.headers;
    const {limit} = req.query;
    if (typeof user === 'string') {
        user = removeHTML(user).trim();
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
    } else {
        res.sendStatus(422);
    }
});

app.post('/status', async (req,res) => {

    let name = req.headers.user;
    if (typeof name === 'string') {
        name = removeHTML(name).trim();
        const validation = nameSchema.validate({name},{abortEarly:true});
        if (validation.error) {
            return res.sendStatus(422);
        } else {
            try {
                await mongo.connect();
                const participants = getParticipants();
                const user = await participants.findOne({name});
                if (user) {
                    await participants.updateOne(
                        {_id: user._id},
                        {$set: {lastStatus: Date.now()}}
                    );
                    res.sendStatus(200);
                } else {
                    mongo.close();
                    return res.sendStatus(404);
                }
            } catch (e) {
                res.sendStatus(500);
            } finally {
                mongo.close();
            }
        }
    } else {
        return res.sendStatus(422);
    }
});

const autoRemove = async () => {
    
    try {
        await mongo.connect();
        const participants = getParticipants();
        const messages = getMessages();
        const condition = {lastStatus: {$lt: Date.now()-10000}};
        const inactives = await participants.find(condition).toArray();
        if(inactives.length !== 0) {
            const exitMessages = inactives.map(({name}) => {
                return new Message(name,'Todos','sai da sala...','status');
            });
            await participants.deleteMany(condition);
            await messages.insertMany(exitMessages);
        } 
    } catch (e) {
        console.log(e);
    } finally {
        mongo.close()
    }
};

setInterval(autoRemove,15000);