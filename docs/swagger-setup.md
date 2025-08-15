# Swagger API Documentation Setup

This document describes the comprehensive Swagger/OpenAPI documentation setup for the TwitterX API.

## Overview

The TwitterX API includes comprehensive Swagger documentation that provides:

- **Interactive API Testing**: Test endpoints directly from the browser
- **Authentication Schemes**: Support for Bearer tokens, session tokens, and OAuth2
- **Detailed Examples**: Request/response examples for all endpoints
- **Error Documentation**: Comprehensive error response schemas
- **Type Safety**: Full TypeScript integration with DTOs

## Accessing the Documentation

Once the application is running, the Swagger UI is available at:

```
http://localhost:3000/api
```

## Features

### 1. Authentication Schemes

The API documentation includes three authentication schemes:

#### Bearer Token Authentication
```yaml
securitySchemes:
  bearer:
    type: http
    scheme: bearer
    bearerFormat: JWT
```

Used for JWT-based authentication (future implementation).

#### Session Token Authentication
```yaml
securitySchemes:
  session:
    type: apiKey
    name: Authorization
    in: header
```

Used for session-based authentication with format: `Bearer <session_token>`

#### Google OAuth2
```yaml
securitySchemes:
  google-oauth:
    type: oauth2
    flows:
      authorizationCode:
        authorizationUrl: https://accounts.google.com/o/oauth2/auth
        tokenUrl: https://oauth2.googleapis.com/token
```

### 2. Endpoint Categories

The API is organized into the following tags:

- **Authentication**: User registration, login, and OAuth endpoints
- **User Management**: User profile and account management endpoints
- **Admin - User Moderation**: Administrative user moderation endpoints
- **Admin - Security**: Administrative security and monitoring endpoints
- **Health**: System health check endpoints

### 3. Comprehensive Error Documentation

All endpoints include detailed error response schemas with:

- HTTP status codes
- Error messages and descriptions
- Error codes for client handling
- Additional context (suggestions, retry information)

Example error response:
```json
{
  "statusCode": 409,
  "message": "Username 'john_doe123' is not available",
  "error": "Conflict",
  "timestamp": "2024-08-13T15:30:00Z",
  "path": "/v1/auth/signup",
  "code": "USERNAME_UNAVAILABLE",
  "suggestions": ["john_doe124", "john_doe_2024", "johndoe123"]
}
```

### 4. Request/Response Examples

Every endpoint includes:

- Detailed request body schemas with examples
- Response schemas with example data
- Parameter descriptions and constraints
- Validation requirements

### 5. Interactive Testing

The Swagger UI allows you to:

- Test endpoints directly from the browser
- Authenticate using session tokens
- View real-time request/response data
- Download OpenAPI specification

## Configuration

The Swagger configuration is located in `src/app.factory.ts`:

```typescript
export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TwitterX API')
    .setDescription('A comprehensive backend service...')
    .setVersion('1.0')
    .addBearerAuth(/* Bearer token config */)
    .addApiKey(/* Session token config */)
    .addOAuth2(/* Google OAuth config */)
    .addTag('Authentication', 'User registration, login, and OAuth endpoints')
    // ... more configuration
    .build();
    
  // ... document setup
}
```

## DTO Documentation

All Data Transfer Objects (DTOs) include comprehensive Swagger decorators:

### Example: SignUpDto
```typescript
export class SignUpDto {
  @ApiProperty({
    description: 'Unique username (3-15 characters, alphanumeric and underscore only)',
    example: 'john_doe123',
    minLength: 3,
    maxLength: 15,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsString()
  @Length(3, 15)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;
  
  // ... more properties
}
```

## Controller Documentation

All controllers include comprehensive endpoint documentation:

### Example: AuthController
```typescript
@ApiTags('Authentication')
@Controller('v1/auth')
export class AuthController {
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Username or email already exists',
    schema: { /* detailed error schema */ }
  })
  async signUp(@Body() signUpDto: SignUpDto): Promise<AuthResponseDto> {
    // ... implementation
  }
}
```

## Customization

The Swagger UI includes custom styling and configuration:

```typescript
SwaggerModule.setup('api', app, document, {
  customSiteTitle: 'TwitterX API Documentation',
  customfavIcon: '/favicon.ico',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #1DA1F2; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
  },
});
```

## Testing with Swagger UI

### 1. Authentication

To test authenticated endpoints:

1. Sign in using the `/v1/auth/signin` endpoint
2. Copy the `sessionToken` from the response
3. Click the "Authorize" button in Swagger UI
4. Enter the session token in the format: `Bearer <session_token>`
5. Test protected endpoints

### 2. Error Testing

The documentation includes examples for all error scenarios:

- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Resource not found (404)
- Conflict errors (409)
- Rate limiting (429)
- Server errors (500)

### 3. Rate Limiting

Rate limiting information is documented for each endpoint:

- Maximum requests per time window
- Rate limit headers in responses
- Retry-after information when limits are exceeded

## OpenAPI Specification

The complete OpenAPI 3.0 specification can be accessed at:

```
http://localhost:3000/api-json
```

This JSON specification can be used with other tools like:

- Postman (import collection)
- Insomnia (import specification)
- Code generators (client SDKs)
- API testing tools

## Development Workflow

### Adding New Endpoints

When adding new endpoints:

1. Add appropriate `@ApiTags()` to the controller
2. Use `@ApiOperation()` for endpoint descriptions
3. Add `@ApiResponse()` for all possible responses
4. Include `@ApiParam()` for path parameters
5. Use `@ApiQuery()` for query parameters
6. Add `@ApiBearerAuth()` or `@ApiSecurity()` for protected endpoints

### DTO Documentation

For new DTOs:

1. Use `@ApiProperty()` for required fields
2. Use `@ApiPropertyOptional()` for optional fields
3. Include examples, descriptions, and constraints
4. Document validation rules and formats

### Error Handling

For custom exceptions:

1. Document error codes and messages
2. Include helpful error details
3. Provide suggestions when applicable
4. Follow consistent error response format

## Best Practices

1. **Consistent Naming**: Use clear, consistent naming for endpoints and parameters
2. **Comprehensive Examples**: Provide realistic examples for all request/response data
3. **Error Documentation**: Document all possible error scenarios
4. **Security**: Clearly indicate which endpoints require authentication
5. **Versioning**: Use API versioning consistently across all endpoints
6. **Validation**: Document all validation rules and constraints

## Troubleshooting

### Common Issues

1. **Missing Authentication**: Ensure `@ApiBearerAuth()` is added to protected endpoints
2. **Invalid Schemas**: Check that DTO decorators match validation rules
3. **Missing Examples**: Add realistic examples to improve documentation quality
4. **Inconsistent Responses**: Ensure response DTOs match actual controller responses

### Verification

Use the verification script to check Swagger configuration:

```bash
node scripts/verify-swagger.js
```

This script will:
- Start the application
- Verify Swagger UI is accessible
- Check for configuration errors
- Confirm all features are working

## Future Enhancements

Potential improvements to the API documentation:

1. **API Versioning**: Support for multiple API versions
2. **Webhooks**: Documentation for webhook endpoints
3. **Rate Limiting**: More detailed rate limiting documentation
4. **SDK Generation**: Automated client SDK generation
5. **Testing Integration**: Integration with automated testing tools
