UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/chase/FFFFFF', 
        "brandColor" = '#117AC9' 
    WHERE name = 'Chase' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/bankofamerica/FFFFFF', 
        "brandColor" = '#012169' 
    WHERE name = 'Bank of America' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/wellsfargo/FFFFFF', 
        "brandColor" = '#d71e28' 
    WHERE name = 'Wells Fargo' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/citibank/FFFFFF', 
        "brandColor" = '#003A8F' 
    WHERE name = 'Citibank Online' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/americanexpress/FFFFFF', 
        "brandColor" = '#006FCF' 
    WHERE name = 'American Express' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/barclays/FFFFFF', 
        "brandColor" = '#00aeef' 
    WHERE name = 'Barclays - Cards' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/capitalone/FFFFFF', 
        "brandColor" = '#0057B8' 
    WHERE name = 'Capital One' 
    AND "logoUrl" IS NULL;

UPDATE banks 
    SET "logoUrl" = 'https://cdn.simpleicons.org/discover/FFFFFF', 
        "brandColor" = '#FF6000' 
    WHERE name = 'Discover' 
    AND "logoUrl" IS NULL;