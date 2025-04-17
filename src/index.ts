import BotClient from './classes/client';
import mongoConnect from './modules/mongoConnect';
import { config } from 'dotenv';

config();

mongoConnect();
    
console.log('Starting bot...');

const client = new BotClient();
client.start();