import express from "express";
import dotenv from 'dotenv';
import cors from 'cors';
import natural from 'natural';
import connection from "./dbconfig.js";
const app = express();

import quarterTaskRoutes from './routes/quarterTaskRoutes.js';
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js'

const bodyParser = require('body-parser');
app.use(bodyParser.json());
// Middleware setup
app.use(cors());
app.use(express.json())
dotenv.config();
// Use the router
app.use('/', quarterTaskRoutes);
app.use('/', authRoutes);
app.use('/', employeeRoutes);



app.listen(5000, () => {
  console.log('Server is running on port 5000');
});



