# BidNow Platform

```
BidNow/
├── BidNow_Api/          # .NET 10 Web API
│   ├── Controllers/     # All API controllers
│   ├── Core/
│   │   ├── DTOs/        # Request/Response models
│   │   ├── Entities/    # Domain entities
│   │   └── Enums/       # Enumerations
│   ├── Infrastructure/
│   │   └── Data/        # EF Core DbContext
│   ├── Program.cs       # App startup & DI
│   ├── appsettings.json # Config (update DB password)
│   └── BidNow.API.csproj
│
└── BidNow_UI/           # Angular 17 SPA
    ├── src/
    │   ├── app/
    │   │   ├── core/services/    # API + SignalR services
    │   │   ├── features/         # Pages & components
    │   │   └── shared/models/    # TypeScript interfaces
    │   ├── environments/
    │   └── styles.scss
    └── package.json
```

## Run API
```zsh
cd BidNow_Api
dotnet restore
ASPNETCORE_ENVIRONMENT=Development dotnet run
# Swagger → http://localhost:5000/swagger
```

## Run UI
```zsh
cd BidNow_UI
npm install
npm start
# App → http://localhost:4200
```

## Database
- AWS RDS PostgreSQL: bidnow-db.cjyw2eeq2nzr.ap-south-1.rds.amazonaws.com
- Update password in BidNow_Api/appsettings.json
