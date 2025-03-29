const nodemailer = require("nodemailer");

class Mailer {
    constructor(Email, Password) {
        this.Email = Email;
        this.Password = Password;
        // Create the transporter 
        this.transporter = nodemailer.createTransport({
            service: 'gmail',  
            auth: {
                user: this.Email,
                pass: this.Password,
            },
        });
    }

    async SendMail(UserEmail, OurEmail, subject, text) {
        const mailOptions = {
            to: UserEmail,
            from: OurEmail, 
            subject: subject,
            text: text,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log("Email sent successfully!");
        } catch (error) {
            console.error("Error sending email:", error);
        }
    }
}

module.exports = Mailer;
