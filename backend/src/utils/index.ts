import { Collection, MongoClient } from "mongodb";
import { Message, Participant } from "../entities";
import { stripHtml } from 'string-strip-html';
import {config as dotenvConfig} from 'dotenv';
import logger from "../logging";

dotenvConfig();

const mongo_url = process.env.MONGO_URL || 'mongodb://localhost:27017';
const mongo = new MongoClient(mongo_url);


export default mongo;

export const existsParticipant = async (
    participants: Collection<Participant>, 
    name: string) => {
        
    return await participants.findOne({name})?true:false;
};

export const getParticipants = () => {

    const participants = (
        mongo.db('batepapo-uol').collection<Participant>('participants')
    );
    return participants;
};

export const getMessages = () => {
   
    const messages = mongo.db('batepapo-uol').collection<Message>('messages');
    return messages;
};

export const removeHTML = (name: string) => stripHtml(name).result;

export const getParticipantsNames = async () => {
    await mongo.connect();
    const result = (
        await getParticipants().find().toArray()
    ).map(({name}) => name);
    mongo.close();
    return result;
};

export const autoRemove = async () => {
    
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
        logger.error(
            'Erro na remoção automática\n'
            +`${e}`
        );
    } finally {
        mongo.close()
    }
};