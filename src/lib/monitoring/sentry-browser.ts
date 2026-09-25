// Only what browser monitoring uses, so the lazily loaded chunk leaves out Replay, feedback and other unused SDK code.
export { breadcrumbsIntegration, captureException, init } from "@sentry/nextjs";
