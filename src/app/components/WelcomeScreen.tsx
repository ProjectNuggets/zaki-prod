import { CenterLogo } from "./icons";

export function WelcomeScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-5">
        <CenterLogo />
        <div className="text-center">
          <h1 className="text-zaki-primary text-lg font-medium mb-1">Marhaba Tarek</h1>
          <p className="text-zaki-muted text-sm font-medium">What can I help you with today?</p>
        </div>
      </div>
    </div>
  );
}
