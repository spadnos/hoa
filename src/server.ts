import 'dotenv/config';
import express from 'express';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createChatHandler } from './chat';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
app.post('/api/chat', createChatHandler(anthropic));

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`EMHOA server running at http://localhost:${port}`);
});
