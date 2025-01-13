import { ObjectSchema } from "yup";
import { Request, Response, NextFunction } from "express";

const validateRequestQuery = (schema: ObjectSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.validate(req.query, { abortEarly: false });
        next();
    } catch (err: any) {
        res.status(400).json({ errors: err.errors });
    }
};

const validateRequestBody = (schema: ObjectSchema<any>) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await schema.validate(req.body, { abortEarly: false });
        next();
    } catch (err: any) {
        res.status(400).json({ errors: err.errors });
    }
};

export { validateRequestQuery, validateRequestBody };
