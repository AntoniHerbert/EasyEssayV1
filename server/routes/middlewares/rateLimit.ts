import rateLimit from 'express-rate-limit';

export const createEssayLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 5, 
	message: { message: "Você está criando muitas redações. Tente novamente mais tarde." },
	standardHeaders: true,
	legacyHeaders: false,
});

export const apiLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, 
	max: 100,
    message: { message: "Muitas requisições. Acalme-se." }
});