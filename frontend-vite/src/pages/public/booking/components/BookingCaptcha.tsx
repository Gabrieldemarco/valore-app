interface BookingCaptchaProps {
  captchaSiteKey: string;
}

const BookingCaptcha = ({ captchaSiteKey }: BookingCaptchaProps) => {
  return (
    <div className="g-recaptcha" data-sitekey={captchaSiteKey} />
  );
};

export default BookingCaptcha;
