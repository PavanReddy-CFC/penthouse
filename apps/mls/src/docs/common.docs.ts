/*
 * OpenAPI building blocks shared by every endpoint in this service.
 * Endpoints reference them with $ref, e.g. $ref: '#/components/schemas/Error'.
 * This file contains documentation only; it has no runtime code.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         statusCode:
 *           type: integer
 *           example: 404
 *         message:
 *           oneOf:
 *             - type: string
 *             - type: array
 *               items:
 *                 type: string
 *           example: Resource not found
 *         error:
 *           type: string
 *           example: Not Found
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 20
 *         total:
 *           type: integer
 *           example: 57
 *         totalPages:
 *           type: integer
 *           example: 3
 *
 *     Health:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [ok, degraded]
 *           example: ok
 *         service:
 *           type: string
 *           description: Value of SERVICE_NAME
 *           example: penthouselife-mls
 *         appEnv:
 *           type: string
 *           description: Value of APP_ENV
 *           example: dev
 *         database:
 *           type: string
 *           enum: [up, down]
 *           example: up
 *         redis:
 *           type: string
 *           enum: [up, down, disabled]
 *           example: up
 *         elasticsearch:
 *           type: string
 *           enum: [up, down, disabled]
 *           example: up
 *         uptimeSeconds:
 *           type: integer
 *           example: 123
 *         timestamp:
 *           type: string
 *           format: date-time
 *
 *   parameters:
 *     Page:
 *       in: query
 *       name: page
 *       required: false
 *       description: Page number, starting at 1
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *     Limit:
 *       in: query
 *       name: limit
 *       required: false
 *       description: Items per page. Defaults to PAGINATION_DEFAULT_LIMIT, capped at PAGINATION_MAX_LIMIT.
 *       schema:
 *         type: integer
 *         minimum: 1
 *         example: 20
 *
 *   responses:
 *     BadRequest:
 *       description: Invalid input. `message` lists every problem.
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             statusCode: 400
 *             message: ["email must be an email"]
 *             error: Bad Request
 *     NotFound:
 *       description: The resource does not exist
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     Conflict:
 *       description: A record with the same unique value already exists
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     TooManyRequests:
 *       description: Rate limit exceeded (RATE_LIMIT_MAX requests per RATE_LIMIT_TTL_SECONDS)
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     ServiceUnavailable:
 *       description: The database is not reachable
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             statusCode: 503
 *             message: The database is not reachable
 *             error: Service Unavailable
 */
export {};
