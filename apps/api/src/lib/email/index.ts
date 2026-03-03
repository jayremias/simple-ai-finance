import { Resend } from "resend";
import { env } from "./env";

const resend = new Resend(env.RESEND_API_KEY);

type SendEmailOptions = {
	to: string;
	subject: string;
	html: string;
	text?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
	try {
		const { error } = await resend.emails.send({
			from: env.EMAIL_FROM,
			to,
			subject,
			html,
			text,
		});

		if (error) {
			console.error("[email] Failed to send:", error.message);
		}
	} catch (err) {
		console.error("[email] Unexpected error:", err);
	}
}
