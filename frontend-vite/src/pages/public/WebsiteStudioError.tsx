interface WebsiteStudioErrorProps {
  message: string;
}

export default function WebsiteStudioError({ message }: WebsiteStudioErrorProps) {
  return (
    <div className="ws-error">
      <div className="ws-error-content">
        <h2>Sitio web no disponible</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}
