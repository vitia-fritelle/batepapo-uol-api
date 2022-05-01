import Joi from 'joi';
import {getParticipantsNames} from '../utils';

export const nameSchema = Joi.object({
    name: Joi.string().required()
});

export const messageSchema = async () => {

    const participants = await getParticipantsNames();
    return Joi.object({
        from: Joi.valid(...participants).required(),
        to: Joi.string().required(),
        type: Joi.valid('message','private_message').required(),
        text: Joi.string().required()
    });
};