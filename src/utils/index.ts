import {Collection, MongoClient} from "mongodb";
import {Message,Participant} from "../entities";

const mongo_url = 'mongodb://localhost:27017';
const mongo = new MongoClient(mongo_url);

export default mongo;

export const existsParticipant = async (
    participants: Collection<Participant>, 
    name: string) => {
        
    return await participants.findOne({name})?true:false;
}

export const getParticipants = () => {
    
    const participants = mongo.db('batepapo-uol').collection<Participant>('participants');
    return participants;
}

export const getMessages = () => {
   
    const messages = mongo.db('batepapo-uol').collection<Message>('messages');
    return messages;
}
