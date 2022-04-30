import {Collection, MongoClient} from "mongodb";

const mongo_url = 'mongodb://localhost:27017';
const mongo = new MongoClient(mongo_url);

export default mongo;

export const existsParticipant = async (participants: Collection, name: string) => {
    return await participants.findOne({name})?true:false;
}

export const getParticipants = async () => {
    
    const participants = mongo.db('batepapo-uol').collection('participants');
    return participants;
}

export const getMessages = async () => {
   
    const messages = mongo.db('batepapo-uol').collection('messages');
    return messages;
}
