import { RequestHandler } from "express";
import data from "../../data.json";

export const get: RequestHandler = async (req, res) => {
    console.log('hello')
    return res.json(data);
}