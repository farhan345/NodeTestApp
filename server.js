const app=require('./app')
const dotenv=require('dotenv');
const axios=require("axios");
const databaseConnection=require('./config/dbCon')
const paypal = require('paypal-rest-sdk');
const cron = require('node-cron');
const socketIO = require('socket.io');

//config dot env
dotenv.config({path:'./config/config.env'});

//paypal integration

paypal.configure({
  'mode': 'sandbox', //sandbox or live 
  'client_id': process.env.PAYPAL_CLIENT_ID,
  'client_secret': process.env.PAYPAL_CLIENT_SECRET
});
const PORT=process.env.PORT||5001

//database connection
databaseConnection();

// const server=multer.diskStorage({ 
//     destination:function(req,file,cb){
//         cb(null,'./uploads')
//     }
// })

//call automatically after 15 mins to update cart
// setInterval(() => {
//     console.log('Wait for 15 mins...')
   
//     axios.delete(`${PORT}/api/v1/cart/delete`).then(response => {
//           const { message } = response.data
//        }).catch((error) => console.log(error.message))
//  }, 900000)


// Schedule the function to run every 15 minutes using node-cron
// cron.schedule('*/1 * * * *', function() {
//   // Call your API route
//   fetch('http://localhost:5000/api/v1/cart/delete', { method: 'DELETE' })
//     .then(response => console.log('Item removed from cart.'))
//     .catch(error => console.error(error));
// });
// cron.schedule('* * * * *', () => {
//   console.log('Running your API call now!');
//   axios.delete('http://localhost:5000/api/v1/cart/delete')
//     .then((response) => {
//       console.log('API call successful');
//       // console.log(response.data.message);
//     })
//     .catch((error) => {
//       console.log('Error calling API:', error);
//     });
// });
// Start your express app


 app.get('/',(req,res)=>{return res.json({msg:"server works"})})

const server = app.listen(process.env.PORT,"0.0.0.0",()=>{
  console.log("server is listening at port "+ process.env.PORT);
})

const io = socketIO(server);

io.on('connection', (socket) => {
  console.log('Client connected');

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
// The io instance is set in Express so it can be grabbed in a route
app.set("io", io)
module.exports = { app, server, io };
