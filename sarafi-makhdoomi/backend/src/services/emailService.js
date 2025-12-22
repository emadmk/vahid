const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: `صرافی گلدن 2026 <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };

      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('خطا در ارسال ایمیل:', error);
      return { success: false, error: error.message };
    }
  }

  async sendOtp(email, otp) {
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37;">صرافی گلدن 2026</h1>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; text-align: center;">
          <h2 style="color: #d4af37;">کد تایید شما</h2>
          <p style="font-size: 32px; letter-spacing: 8px; color: #d4af37; font-weight: bold;">${otp}</p>
          <p style="color: #ccc;">این کد تا 10 دقیقه معتبر است</p>
        </div>
        <p style="text-align: center; color: #888; margin-top: 20px; font-size: 12px;">
          اگر شما این درخواست را نداده‌اید، لطفا این ایمیل را نادیده بگیرید.
        </p>
      </div>
    `;

    return this.sendEmail(email, 'کد تایید - صرافی گلدن 2026', html);
  }

  async sendWelcome(email, name) {
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37;">صرافی گلدن 2026</h1>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h2 style="color: #d4af37;">خوش آمدید ${name} عزیز!</h2>
          <p>ثبت‌نام شما با موفقیت انجام شد.</p>
          <p>حساب شما در حال بررسی است و پس از تایید، به شما اطلاع داده خواهد شد.</p>
        </div>
      </div>
    `;

    return this.sendEmail(email, 'خوش آمدید - صرافی گلدن 2026', html);
  }

  async sendApproval(email, name) {
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37;">صرافی گلدن 2026</h1>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h2 style="color: #4CAF50;">حساب شما تایید شد!</h2>
          <p>${name} عزیز،</p>
          <p>حساب کاربری شما با موفقیت تایید شد. اکنون می‌توانید از خدمات صرافی استفاده کنید.</p>
        </div>
      </div>
    `;

    return this.sendEmail(email, 'تایید حساب - صرافی گلدن 2026', html);
  }

  async sendRejection(email, name, reason) {
    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37;">صرافی گلدن 2026</h1>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h2 style="color: #f44336;">متاسفانه درخواست شما رد شد</h2>
          <p>${name} عزیز،</p>
          <p>علت: ${reason}</p>
          <p>در صورت نیاز می‌توانید مجددا اقدام کنید.</p>
        </div>
      </div>
    `;

    return this.sendEmail(email, 'رد درخواست - صرافی گلدن 2026', html);
  }

  async sendRequestNotification(email, name, requestType, status, details = {}) {
    const statusTexts = {
      'pending': 'در انتظار بررسی',
      'public': 'منتشر شده در بخش عمومی',
      'private': 'در حال پیگیری توسط صراف',
      'accepted': 'پذیرفته شده',
      'completed': 'تکمیل شده',
      'rejected': 'رد شده'
    };

    const typeText = requestType === 'buy' ? 'خرید' : 'فروش';

    const html = `
      <div dir="rtl" style="font-family: Tahoma, Arial; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #d4af37;">صرافی گلدن 2026</h1>
        </div>
        <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h2 style="color: #d4af37;">وضعیت درخواست ${typeText}</h2>
          <p>${name} عزیز،</p>
          <p>وضعیت درخواست شما: <strong style="color: #d4af37;">${statusTexts[status]}</strong></p>
          ${details.reason ? `<p>توضیحات: ${details.reason}</p>` : ''}
          ${details.sarafiName ? `<p>صراف: ${details.sarafiName}</p>` : ''}
        </div>
      </div>
    `;

    return this.sendEmail(email, `وضعیت درخواست ${typeText} - صرافی گلدن 2026`, html);
  }
}

module.exports = new EmailService();
