/**
 * Global Error Handler and Logger
 * Centralized error handling for the application
 */

export interface ErrorLog {
	message: string;
	timestamp: string;
	severity: "info" | "warning" | "error" | "critical";
	context?: Record<string, unknown>;
}

const errorLogs: ErrorLog[] = [];

export const errorHandler = {
	/**
	 * Log an error
	 */
	log: (
		message: string,
		severity: ErrorLog["severity"] = "error",
		context?: Record<string, unknown>,
	) => {
		const errorLog: ErrorLog = {
			message,
			timestamp: new Date().toISOString(),
			severity,
			context,
		};

		errorLogs.push(errorLog);
		console.error(`[${severity.toUpperCase()}] ${message}`, context);
	},

	/**
	 * Log an API error
	 */
	logApiError: (error: unknown, endpoint: string) => {
		const message =
			error instanceof Error ? error.message : "Unknown API error";
		errorHandler.log(`API Error: ${message} (${endpoint})`, "error", {
			endpoint,
			error,
		});
	},

	/**
	 * Log a validation error
	 */
	logValidationError: (fields: Record<string, string>) => {
		errorHandler.log("Validation failed", "warning", { fields });
	},

	/**
	 * Get all error logs
	 */
	getLogs: (): ErrorLog[] => [...errorLogs],

	/**
	 * Clear error logs
	 */
	clearLogs: () => {
		errorLogs.length = 0;
	},

	/**
	 * Get recent errors
	 */
	getRecent: (count: number = 5): ErrorLog[] => {
		return errorLogs.slice(-count);
	},
};

/**
 * Global error handler for unhandled promise rejections
 */
export const setupGlobalErrorHandlers = () => {
	window.addEventListener("unhandledrejection", (event) => {
		errorHandler.log(
			`Unhandled Promise Rejection: ${event.reason}`,
			"critical",
			{ reason: event.reason },
		);
	});

	window.addEventListener("error", (event) => {
		errorHandler.log(`Uncaught Error: ${event.message}`, "critical", {
			filename: event.filename,
			lineno: event.lineno,
		});
	});
};
