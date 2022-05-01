import cors from 'cors';
import express from 'express';
import logger from './logging';
import mongo from './utils';
import chalk from 'chalk';

import {ObjectId} from 'mongodb';
import {Message, Participant} from './entities';
import {config as dotenvConfig} from 'dotenv';
import {json} from 'express';
import {messageSchema, nameSchema} from './schemas';
import {existsParticipant, getMessages, getParticipants, 
    removeHTML, autoRemove} from './utils';

dotenvConfig();

const app = express();

app.use(cors(), json());

const link_chalk = chalk.italic; 
const message_chalk = chalk.rgb(142,125,190);
const port = process.env.PORT || '5000';
app.listen(port, () => 
    console.log(
        message_chalk('⚡[server] O servidor está escutando na porta:')
        +link_chalk(` https://localhost:${port}`)
    )
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
                logger.error(
                    'Erro em post/participants\n'
                    +'O usuário já existe!'
                );
                return res.sendStatus(409);
            } else {
                await participants.insertOne(new Participant(name));
                await messages.insertOne(
                    new Message(name,'Todos','entra na sala...','status')
                );
                res.sendStatus(201);
            }
        } catch(e) {
            logger.error(
                'Erro em post/participants\n'
                +`${e}`
            );
            res.sendStatus(500);
        }
    }
});

app.get('/participants', async (_,res) => {

    try {
        await mongo.connect();
        const participants = await getParticipants().find().toArray();
        res.status(201).send(participants);
    } catch (e) {
        logger.error(
            'Erro em get/participants\n'
            +`${e}`
        );
        res.sendStatus(500);
    }
});

app.post('/messages', async (req,res) => {

    const {to,text,type} = {
        to:removeHTML(req.body.to).trim(),
        text:removeHTML(req.body.text).trim(),
        type:removeHTML(req.body.type).trim()
    };
    let from = req.headers.user;
    if (typeof from === 'string') {
        from = removeHTML(from).trim(); 
        const validation = (await messageSchema()).validate(
            {from,to,text,type}, 
            {abortEarly:true}
        );
        if (validation.error) {
            logger.error(
                'Erro em get/messages\n'
                +'Passando dados em formato inapropriado'
            );
            return res.sendStatus(422);
        } else {
            const message = new Message(from, to, text, type);
            try {
                await mongo.connect();
                const participants = getParticipants();
                const messages = getMessages();
                const size = await participants.estimatedDocumentCount();
                if (size === 0) {
                    logger.error(
                        'Erro em get/messages\n'
                        +'Não há participantes logados!'
                    );
                    return res.sendStatus(422);
                } else {
                    await messages.insertOne(message);
                    res.sendStatus(201);
                }
            } catch (e) {
                logger.error(
                    'Erro em post/messages\n'
                    +`${e}`
                );
                res.sendStatus(500);
            }
        }
    } else {
        logger.error(
            'Erro em post/messages\n'
            +'Passando headers em formato inapropriado'
        );
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
                const end = userMessages.length;
                const start = end-parseInt(limit);
                const result = userMessages.slice(start,end);
                res.status(201).send(result);
            } else {
                res.status(201).send(userMessages);
            }
        } catch (e) {
            logger.error(
                'Erro em get/messages\n'
                +`${e}`
            );
            res.sendStatus(500);
        }
    } else {
        logger.error(
            'Erro em get/messages\n'
            +'Passando headers em formato inapropriado'
        );
        res.sendStatus(422);
    }
});

app.delete('/messages/:messageId', async (req,res) => {

    let {user} = req.headers;
    const {messageId} = req.params;
    if (typeof user === 'string') {
        user = removeHTML(user).trim();
        try {
            await mongo.connect();
            const messages = getMessages();
            const _id = new ObjectId(messageId);
            const message = await messages.findOne({_id});
            
            if (message) {
                if (message.from === user) {
                    await messages.deleteOne({_id});
                    res.sendStatus(200);
                } else {
                    logger.error(
                        'Erro em delete/messages/:id.\n'
                        +'mensagem não pertence ao usuário passado'
                    );
                    res.sendStatus(401);
                }
            } else {
                logger.error(
                    'Erro em delete/messages/:id\n'
                    +'_id da mensagem não encontrado'
                );
                res.sendStatus(404);
            }
        } catch (e) {
            logger.error(
                'Erro em delete/messages/:id\n'
                +`${e}`
            );
            res.sendStatus(404);
        }
    } else {
        logger.error(
            'Erro em delete/messages/:id.\n'
            +'Passando headers em formato inapropriado'
        );
        res.sendStatus(422);
    }
});

app.put('/messages/:messageId', async (req,res) => {

    const {to,text,type} = {
        to:removeHTML(req.body.to).trim(),
        text:removeHTML(req.body.text).trim(),
        type:removeHTML(req.body.type).trim()
    };
    let from = req.headers.user;
    const {messageId} = req.params;
    if (typeof from === 'string') {
        from = removeHTML(from).trim(); 
        const validation = (await messageSchema()).validate(
            {from,to,text,type}, 
            {abortEarly:true}
        );
        if (validation.error) {
            logger.error(
                'Erro em put/messages/:id.\n'
                +'Passando body em formato inapropriado'
            );
            return res.sendStatus(422);
        } else {
            try {
                await mongo.connect();
                const messages = getMessages();
                const _id = new ObjectId(messageId);
                const message = await messages.findOne({_id});
                if (message) {
                    if (message.from === from) {
                        await messages.updateOne(
                            {_id},
                            {$set: new Message(from,to,text,type)}
                        );
                        res.sendStatus(200);
                    } else {
                        logger.error(
                            'Erro em put/messages/:id.\n'
                            +'mensagem não pertence ao usuário passado'
                        );
                        res.sendStatus(401);
                    }
                } else {
                    logger.error(
                        'Erro em put/messages/:id.\n'
                        +'_id da mensagem não encontrado'
                    );
                    res.sendStatus(404);
                }
            } catch (e) {
                logger.error(
                    'Erro em put/messages/:id\n'
                    +`${e}`
                );
                res.sendStatus(500);
            }
        }
    } else {
        logger.error(
            'Erro em put/messages/:id.\n'
            +'Passando headers em formato inapropriado'
        );
        return res.sendStatus(422);
    }
});

app.post('/status', async (req,res) => {

    let name = req.headers.user;
    if (typeof name === 'string') {
        name = removeHTML(name).trim();
        const validation = nameSchema.validate({name},{abortEarly:true});
        if (validation.error) {
            logger.error(
                'Erro em post/status.\n'
                +'Passando headers em formato inapropriado'
            );
            return res.sendStatus(422);
        } else {
            try {
                await mongo.connect();
                const participants = getParticipants();
                const user = await participants.findOne({name});
                if (user) {
                    await participants.updateOne(
                        {_id: user._id},
                        {$set: new Participant(name)}
                    );
                    res.sendStatus(200);
                } else {
                    logger.error(
                        'Erro em post/status\n'
                        +'Usuário inexistente'
                    );
                    return res.sendStatus(404);
                }
            } catch (e) {
                logger.error(
                    'Erro em post/status\n'
                    +`${e}`
                );
                res.sendStatus(500);
            }
        }
    } else {
        logger.error(
            'Erro em post/status.\n'
            +'Passando headers em formato inapropriado'
        );
        return res.sendStatus(422);
    }
});

setInterval(autoRemove,15000);
