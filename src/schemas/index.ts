import Joi from 'joi';

export const nameSchema = Joi.object({
    name: Joi.string().required()
});

