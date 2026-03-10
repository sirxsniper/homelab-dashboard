import { useState, useEffect, useRef } from 'react';

const WEATHER_ICONS = {
  '01d': 'sun',
  '01n': 'moon',
  '02d': 'cloud-sun',
  '02n': 'cloud-moon',
  '03d': 'cloud',
  '03n': 'cloud',
  '04d': 'clouds',
  '04n': 'clouds',
  '09d': 'rain',
  '09n': 'rain',
  '10d': 'rain-sun',
  '10n': 'rain-moon',
  '11d': 'thunder',
  '11n': 'thunder',
  '13d': 'snow',
  '13n': 'snow',
  '50d': 'mist',
  '50n': 'mist',
};

function WeatherIcon({ type, size = 36 }) {
  const s = size;
  const h = s / 2;

  if (type === 'sun') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon weather-sun">
      <circle cx="18" cy="18" r="7" fill="#fbbf24" className="sun-core" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <line key={i} x1="18" y1="4" x2="18" y2="8" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${deg} 18 18)`} className="sun-ray" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </svg>
  );

  if (type === 'moon') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon weather-moon">
      <path d="M22 8a10 10 0 1 0 0 20 8 8 0 0 1 0-20z" fill="#94a3b8" className="moon-body" />
    </svg>
  );

  if (type === 'cloud' || type === 'clouds') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon weather-cloud">
      <path d="M10 24a5 5 0 0 1-.5-9.97 7 7 0 0 1 13.36-2.9A6 6 0 0 1 28 17a5 5 0 0 1-1 10H10z"
        fill={type === 'clouds' ? '#64748b' : '#94a3b8'} className="cloud-body" />
    </svg>
  );

  if (type === 'cloud-sun') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon">
      <circle cx="12" cy="13" r="5" fill="#fbbf24" className="sun-core" />
      {[0, 60, 120, 180, 240, 300].map((deg, i) => (
        <line key={i} x1="12" y1="4" x2="12" y2="6.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"
          transform={`rotate(${deg} 12 13)`} className="sun-ray" style={{ animationDelay: `${i * 0.12}s` }} />
      ))}
      <path d="M12 26a4 4 0 0 1-.4-7.97 5.5 5.5 0 0 1 10.5-2.3A5 5 0 0 1 27 20a4 4 0 0 1-1 8H12z" fill="#94a3b8" className="cloud-body" />
    </svg>
  );

  if (type === 'cloud-moon') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon">
      <path d="M16 6a7 7 0 1 0 0 14 5.6 5.6 0 0 1 0-14z" fill="#94a3b8" className="moon-body" />
      <path d="M12 26a4 4 0 0 1-.4-7.97 5.5 5.5 0 0 1 10.5-2.3A5 5 0 0 1 27 20a4 4 0 0 1-1 8H12z" fill="#64748b" className="cloud-body" />
    </svg>
  );

  if (type === 'rain' || type === 'rain-sun' || type === 'rain-moon') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon">
      {type === 'rain-sun' && <circle cx="10" cy="10" r="4" fill="#fbbf24" className="sun-core" />}
      {type === 'rain-moon' && <path d="M14 5a5 5 0 1 0 0 10 4 4 0 0 1 0-10z" fill="#94a3b8" className="moon-body" />}
      <path d="M10 22a4 4 0 0 1-.4-7.97 5.5 5.5 0 0 1 10.5-2.3A5 5 0 0 1 27 16a4 4 0 0 1-1 8H10z" fill="#64748b" className="cloud-body" />
      {[14, 19, 24].map((x, i) => (
        <line key={i} x1={x} y1="25" x2={x - 1} y2="30" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"
          className="rain-drop" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </svg>
  );

  if (type === 'thunder') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon">
      <path d="M10 20a4 4 0 0 1-.4-7.97 5.5 5.5 0 0 1 10.5-2.3A5 5 0 0 1 27 14a4 4 0 0 1-1 8H10z" fill="#64748b" className="cloud-body" />
      <polygon points="19,20 15,27 18,27 16,33 23,25 19.5,25 22,20" fill="#fbbf24" className="lightning-bolt" />
    </svg>
  );

  if (type === 'snow') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon">
      <path d="M10 22a4 4 0 0 1-.4-7.97 5.5 5.5 0 0 1 10.5-2.3A5 5 0 0 1 27 16a4 4 0 0 1-1 8H10z" fill="#94a3b8" className="cloud-body" />
      {[13, 18, 23].map((x, i) => (
        <circle key={i} cx={x} cy={27 + i} r="1.5" fill="#e2e8f0" className="snowflake" style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
    </svg>
  );

  if (type === 'mist') return (
    <svg width={s} height={s} viewBox="0 0 36 36" className="weather-icon weather-mist">
      {[13, 17, 21].map((y, i) => (
        <line key={i} x1="8" y1={y} x2="28" y2={y} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
          opacity={0.6 - i * 0.12} className="mist-line" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </svg>
  );

  // fallback
  return <svg width={s} height={s} viewBox="0 0 36 36"><circle cx="18" cy="18" r="6" fill="#64748b" /></svg>;
}

export default function WeatherWidget({ apiKey, location, units = 'metric' }) {
  const [weather, setWeather] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!apiKey || !location) return;

    const fetchWeather = async () => {
      try {
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&units=${units}&appid=${apiKey}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setWeather({
          temp: Math.round(data.main.temp),
          feelsLike: Math.round(data.main.feels_like),
          description: data.weather[0]?.description || '',
          icon: WEATHER_ICONS[data.weather[0]?.icon] || 'cloud',
          humidity: data.main.humidity,
          wind: Math.round(data.wind?.speed || 0),
          city: data.name,
        });
      } catch {}
    };

    fetchWeather();
    intervalRef.current = setInterval(fetchWeather, 10 * 60 * 1000); // refresh every 10min
    return () => clearInterval(intervalRef.current);
  }, [apiKey, location, units]);

  if (!weather) return null;

  const unitSymbol = units === 'imperial' ? '°F' : '°C';
  const windUnit = units === 'imperial' ? 'mph' : 'm/s';

  return (
    <div className="weather-widget">
      <div className="weather-icon-wrap">
        <WeatherIcon type={weather.icon} size={42} />
      </div>
      <div className="weather-main">
        <div className="weather-temp-row">
          <span className="weather-temp">{weather.temp}{unitSymbol}</span>
          <span className="weather-feels">Feels {weather.feelsLike}{unitSymbol}</span>
        </div>
        <div className="weather-desc">{weather.description}</div>
      </div>
      <div className="weather-divider" />
      <div className="weather-meta">
        <div className="weather-meta-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v6l3 3"/><circle cx="12" cy="14" r="8"/></svg>
          <span>{weather.humidity}%</span>
        </div>
        <div className="weather-meta-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
          <span>{weather.wind} {windUnit}</span>
        </div>
      </div>
      <div className="weather-city">{weather.city}</div>
    </div>
  );
}
