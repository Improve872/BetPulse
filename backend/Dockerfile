# syntax=docker/dockerfile:1

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S betpulse && adduser -S betpulse -G betpulse

COPY --from=build /app/target/betpulse-*.jar ./app.jar
RUN mkdir -p /app/logs && chown -R betpulse:betpulse /app

USER betpulse
EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=12 \
  CMD wget -qO- http://127.0.0.1:8081/api/health >/dev/null || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
