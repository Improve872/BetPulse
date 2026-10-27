"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Language = "es" | "en";

const es = {
  "lang.label": "Idioma",
  "lang.es": "ES",
  "lang.en": "EN",
  "nav.live": "En vivo",
  "nav.upcoming": "Próximos",
  "nav.results": "Resultados",
  "nav.myBets": "Mis apuestas",
  "header.login": "Iniciar sesión",
  "header.register": "Registrarse",
  "header.openMenu": "Abrir menú",
  "header.closeMenu": "Cerrar menú",
  "games.label": "Juegos",
  "games.soon": "Pronto",
  "games.live": "Disponible",
  "lobby.eyebrow": "Dota 2",
  "lobby.title": "Partidas en vivo",
  "lobby.titleAll": "Partidas y resultados",
  "lobby.titleLive": "Partidas en vivo",
  "lobby.titleResults": "Resultados recientes",
  "lobby.titleUpcoming": "Próximos partidos",
  "lobby.subtitle": "Sigue los partidos y arma tu apuesta.",
  "lobby.liveCount": "{count} en vivo",
  "lobby.resultsCount": "{count} resultados",
  "lobby.updated": "Actualizado {time}",
  "filters.title": "Filtros",
  "filters.clear": "Limpiar",
  "filters.state": "Estado",
  "filters.tournament": "Torneos",
  "filters.allTournaments": "Todos los torneos",
  "filters.showing": "{count} partidas",
  "state.all": "Todos",
  "state.live": "En vivo",
  "state.results": "Resultados",
  "state.upcoming": "Próximos",
  "match.live": "En vivo",
  "match.final": "Final",
  "match.ranked": "Ranked · alto MMR",
  "match.pro": "Dota 2 profesional",
  "match.market": "Ganador del mapa",
  "match.noMarkets": "Mercados no publicados",
  "match.open": "Ver partido",
  "match.spectators": "{count} espectadores",
  "match.spectatorsLabel": "Espectadores",
  "match.mmr": "{mmr} MMR",
  "match.mmrLabel": "MMR promedio",
  "match.delay": "{seconds}s de delay",
  "match.delayLabel": "Delay",
  "match.format": "Formato",
  "match.gameTime": "Tiempo de juego",
  "match.duration": "Duración",
  "match.started": "Inicio",
  "match.winner": "Ganador",
  "match.summary": "Resumen",
  "match.markets": "Mercados",
  "match.marketsEmptyTitle": "Aún no hay mercados",
  "match.marketsEmptyBody":
    "El motor de cuotas publicará los mercados de este partido en la siguiente etapa.",
  "match.close": "Cerrar",
  "ticker.live": "En vivo",
  "ticker.empty": "No hay partidas en vivo ahora.",
  "ticker.updated": "Actualizado {time}",
  "bet.title": "Tu apuesta",
  "bet.emptyTitle": "Aún no hay selecciones",
  "bet.emptyBody": "Elige un partido para ver sus mercados.",
  "bet.explore": "Explorar partidas",
  "bet.login": "Iniciar sesión",
  "bet.note": "Las apuestas se habilitan al conectar identidad y wallet.",
  "bet.open": "Ver apuesta",
  "login.title": "Inicia sesión",
  "login.registerTitle": "Crea tu cuenta",
  "login.subtitle": "Accede a tu cuenta para apostar y seguir tus movimientos.",
  "login.registerSubtitle":
    "Empieza con un saldo ficticio y explora los mercados.",
  "login.tabLogin": "Ingresar",
  "login.tabRegister": "Crear cuenta",
  "login.name": "Nombre",
  "login.email": "Correo",
  "login.password": "Contraseña",
  "login.forgot": "¿Olvidaste tu contraseña?",
  "login.submitLogin": "Ingresar",
  "login.submitRegister": "Crear cuenta",
  "login.terms": "Acepto los términos y la política de privacidad.",
  "login.pending":
    "El acceso con cuenta se habilitará al conectar el módulo de identidad.",
  "login.recoveryPending":
    "La recuperación de contraseña se habilitará con el módulo de identidad.",
  "login.guest": "Seguir explorando sin cuenta",
  "login.close": "Cerrar",
  "login.showPassword": "Mostrar contraseña",
  "login.hidePassword": "Ocultar contraseña",
  "empty.title": "No hay partidas para este filtro",
  "empty.body": "Prueba con otro torneo o vuelve a ver todas las partidas.",
  "empty.action": "Ver todas las partidas",
  "footer.project": "© 2026 BetPulse. Proyecto académico.",
  "footer.legal": "Saldo ficticio. Sin dinero real.",
} as const;

export type TranslationKey = keyof typeof es;

const en: Record<TranslationKey, string> = {
  "lang.label": "Language",
  "lang.es": "ES",
  "lang.en": "EN",
  "nav.live": "Live",
  "nav.upcoming": "Upcoming",
  "nav.results": "Results",
  "nav.myBets": "My bets",
  "header.login": "Sign in",
  "header.register": "Sign up",
  "header.openMenu": "Open menu",
  "header.closeMenu": "Close menu",
  "games.label": "Games",
  "games.soon": "Soon",
  "games.live": "Available",
  "lobby.eyebrow": "Dota 2",
  "lobby.title": "Live matches",
  "lobby.titleAll": "Matches and results",
  "lobby.titleLive": "Live matches",
  "lobby.titleResults": "Recent results",
  "lobby.titleUpcoming": "Upcoming matches",
  "lobby.subtitle": "Follow the matches and build your bet.",
  "lobby.liveCount": "{count} live",
  "lobby.resultsCount": "{count} results",
  "lobby.updated": "Updated {time}",
  "filters.title": "Filters",
  "filters.clear": "Clear",
  "filters.state": "Status",
  "filters.tournament": "Tournaments",
  "filters.allTournaments": "All tournaments",
  "filters.showing": "{count} matches",
  "state.all": "All",
  "state.live": "Live",
  "state.results": "Results",
  "state.upcoming": "Upcoming",
  "match.live": "Live",
  "match.final": "Final",
  "match.ranked": "Ranked · high MMR",
  "match.pro": "Dota 2 pro",
  "match.market": "Map winner",
  "match.noMarkets": "Markets not published",
  "match.open": "View match",
  "match.spectators": "{count} viewers",
  "match.spectatorsLabel": "Viewers",
  "match.mmr": "{mmr} MMR",
  "match.mmrLabel": "Average MMR",
  "match.delay": "{seconds}s delay",
  "match.delayLabel": "Delay",
  "match.format": "Format",
  "match.gameTime": "Game time",
  "match.duration": "Duration",
  "match.started": "Started",
  "match.winner": "Winner",
  "match.summary": "Summary",
  "match.markets": "Markets",
  "match.marketsEmptyTitle": "No markets yet",
  "match.marketsEmptyBody":
    "The odds engine will publish markets for this match in the next stage.",
  "match.close": "Close",
  "ticker.live": "Live",
  "ticker.empty": "No live matches right now.",
  "ticker.updated": "Updated {time}",
  "bet.title": "Your bet",
  "bet.emptyTitle": "No selections yet",
  "bet.emptyBody": "Choose a match to see its markets.",
  "bet.explore": "Browse matches",
  "bet.login": "Sign in",
  "bet.note": "Betting unlocks when identity and wallet are connected.",
  "bet.open": "View bet",
  "login.title": "Sign in",
  "login.registerTitle": "Create your account",
  "login.subtitle": "Access your account to bet and track your activity.",
  "login.registerSubtitle":
    "Start with a fictional balance and explore the markets.",
  "login.tabLogin": "Sign in",
  "login.tabRegister": "Create account",
  "login.name": "Name",
  "login.email": "Email",
  "login.password": "Password",
  "login.forgot": "Forgot your password?",
  "login.submitLogin": "Sign in",
  "login.submitRegister": "Create account",
  "login.terms": "I accept the terms and privacy policy.",
  "login.pending":
    "Account access will be enabled when identity is connected.",
  "login.recoveryPending":
    "Password recovery will be enabled with the identity module.",
  "login.guest": "Keep browsing without an account",
  "login.close": "Close",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",
  "empty.title": "No matches for this filter",
  "empty.body": "Try another tournament or go back to all matches.",
  "empty.action": "See all matches",
  "footer.project": "© 2026 BetPulse. Academic project.",
  "footer.legal": "Fictional balance. No real money.",
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  es,
  en,
};

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (
    key: TranslationKey,
    values?: Record<string, string | number>,
  ) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");

  useEffect(() => {
    const stored = window.localStorage.getItem("betpulse.language");
    if (stored === "es" || stored === "en") {
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    window.localStorage.setItem("betpulse.language", next);
  };

  const t = (
    key: TranslationKey,
    values?: Record<string, string | number>,
  ) => {
    let value = dictionaries[language][key];
    if (values) {
      for (const [name, replacement] of Object.entries(values)) {
        value = value.replaceAll(`{${name}}`, String(replacement));
      }
    }
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
