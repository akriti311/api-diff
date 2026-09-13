export const EXAMPLE_OLD = `openapi: 3.0.3
info:
  title: Users API
  version: 1.0.0
paths:
  /users/{id}:
    get:
      summary: Get a user by id
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: A user
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  name:
                    type: string
                  email:
                    type: string
`;

export const EXAMPLE_NEW = `openapi: 3.0.3
info:
  title: Users API
  version: 1.1.0
paths:
  /users/{id}:
    get:
      summary: Get a user by id
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: A user
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: integer
                  email:
                    type: string
`;
