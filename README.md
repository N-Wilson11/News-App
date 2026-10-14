# Nathan Nieuwsflits

Een Node.js-nieuwsapp die recente artikelen uit Nederland en de wereld toont. Elk artikel bevat een afbeelding, bron, compacte samenvatting en een link naar het oorspronkelijke bericht.

## Installeren en starten

1. Maak gratis een API-sleutel aan via [GNews](https://gnews.io/).
2. Kopieer `.env.example` naar `.env` en vul `GNEWS_API_KEY` in.
3. Installeer de afhankelijkheden:

   ```bash
   npm install
   ```

4. Start de app:

   ```bash
   npm start
   ```

Open daarna [http://localhost:3000](http://localhost:3000).

## Docker

1. Kopieer `.env.example` naar `.env` en vul `GNEWS_API_KEY` in.
2. Bouw en start de container:

   ```bash
   docker compose up --build -d
   ```

Open daarna [http://localhost:3000](http://localhost:3000). Stop de app weer met:

```bash
docker compose down
```

De standaardpoort is `3000`. Wijzig `PORT` in `.env` om zowel de app als de Docker-poortkoppeling op een andere poort te draaien.

## Nieuwsbronnen

De server haalt artikelen op via de [GNews API](https://gnews.io/). De API-sleutel blijft op de server en wordt niet naar de browser gestuurd. De samenvatting wordt samengesteld uit de eerste een of twee zinnen van de artikelbeschrijving die de nieuwsbron aanlevert.
