import logoImage from '../assets/event-thunder-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo = ({ size = 'md' }: LogoProps) => {
  const sizeMap = {
    sm: { width: 50, height: 50 },
    md: { width: 80, height: 80 },
    lg: { width: 150, height: 150 },
  };

  const { width, height } = sizeMap[size];

  return (
    <div className="flex items-center justify-center">
      <img 
        src={logoImage} 
        alt="Event Thunder Logo" 
        style={{ width: `${width}px`, height: `${height}px` }}
        className="drop-shadow-lg hover:drop-shadow-2xl transition-all duration-300"
      />
    </div>
  );
};

export default Logo;
