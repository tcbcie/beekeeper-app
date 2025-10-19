-- Add eircode column to apiaries table
ALTER TABLE apiaries
ADD COLUMN IF NOT EXISTS eircode VARCHAR(8);

COMMENT ON COLUMN apiaries.eircode IS 'Eircode for the apiary location (used for weather data)';

-- Add weather columns to inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS weather_temp INTEGER,
ADD COLUMN IF NOT EXISTS weather_condition VARCHAR(50),
ADD COLUMN IF NOT EXISTS weather_humidity INTEGER,
ADD COLUMN IF NOT EXISTS weather_wind_speed INTEGER;

-- Add comments to the weather columns
COMMENT ON COLUMN inspections.weather_temp IS 'Temperature in Celsius at time of inspection';
COMMENT ON COLUMN inspections.weather_condition IS 'Weather condition description (e.g., Clear, Cloudy, Rain)';
COMMENT ON COLUMN inspections.weather_humidity IS 'Relative humidity percentage';
COMMENT ON COLUMN inspections.weather_wind_speed IS 'Wind speed in km/h';
