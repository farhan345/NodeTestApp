const nodemailer=require('nodemailer');

const sendEmailWithTemplate=async(options)=>{

    const transporter=nodemailer.createTransport({
        host:"leadingspark.com",
        port:465,
        secure:true,
        auth:{
            user:process.env.SMTP_USER,
            pass:process.env.SMTP_PASSWORD
        }
    })
    const mailOptions={ 
        from:process.env.SMTP_USER,
        to:options.email,  
        subject:options.subject,
        html:options.htmlModified

    }
   return await transporter.sendMail(mailOptions)
}

module.exports=sendEmailWithTemplate
