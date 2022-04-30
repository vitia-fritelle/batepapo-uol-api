import Joi from 'joi';

export const nameSchema = Joi.object({
    name: Joi.string().required()
});

export const messageSchema = Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
    type: Joi.string().valid('message','private_message').required(),
    text: Joi.string().required()
});