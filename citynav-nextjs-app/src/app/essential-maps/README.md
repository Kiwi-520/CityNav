# Essential Maps Feature

## Overview

The Essential Maps feature is a core component of the CityNav Progressive Web App (PWA) that helps users discover and navigate to essential Points of Interest (POIs) in Indian cities. Built with Next.js, React, and OpenStreetMap integration, this feature provides real-time location-based services with offline capabilities.

## Features

### 🗺️ Interactive Map

- **OpenStreetMap Integration**: Uses Leaflet and React-Leaflet for smooth map interactions
- **Real-time Location**: Displays user's current location with animated marker
- **Zoom & Pan**: Smooth map navigation with custom controls
- **Custom POI Markers**: Distinctive icons for different types of essential locations

### 📍 Points of Interest (POIs)

- **Restrooms**: Public toilets with cleanliness and safety ratings
- **ATMs**: Bank ATMs with working status and security information
- **Water Stations**: Drinking water points with quality ratings
- **Food Courts**: Restaurants and food courts with safety scores

### 🔍 Smart Filtering

- **Advanced Filter Panel**: Multi-select filtering by POI categories
- **Real-time Results**: Instant filtering without page reloads
- **Filter Badges**: Visual indicators showing active filters
- **Clear All Option**: Quick reset of all applied filters

### ⭐ Community Ratings

- **Cleanliness Scores**: User-generated cleanliness ratings
- **Safety Ratings**: Community-driven safety assessments
- **Working Status**: Real-time status for ATMs and facilities
- **Color-coded Ratings**: Visual rating system with color indicators

### 🔖 Bookmark System

- **Save POIs**: Bookmark frequently used locations
- **Quick Access**: Easy access to saved locations
- **Persistent Storage**: Bookmarks saved locally and synced when online
- **Visual Indicators**: Clear bookmark status on map and list

### 📱 Responsive Design

- **Mobile-first**: Optimized for mobile devices
- **Touch-friendly**: Large touch targets for easy interaction
- **Adaptive UI**: Adjusts to different screen sizes
- **PWA Ready**: Works offline with cached data

## Technical Implementation

### Technologies Used

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **React-Leaflet**: React components for Leaflet maps
- **OpenStreetMap**: Free, open-source map data
- **CSS Modules**: Scoped styling
- **React Icons**: Consistent iconography

### API Integration

- **Overpass API**: Queries OpenStreetMap for POI data
- **Nominatim**: Geocoding and place search
- **Real-time Data**: Live POI information from OSM database
- **Fallback System**: Cached data when API is unavailable

### Architecture

```
src/
├── app/essential-maps/           # Main feature page
│   ├── page.tsx                  # Essential Maps main page
│   └── essential-maps.module.css # Page-specific styles
├── components/essential-maps/    # Feature components
│   ├── EssentialMapComponent.tsx # Interactive map
│   ├── POIFilterComponent.tsx    # Filter controls
│   └── POIListComponent.tsx      # POI list panel
└── services/
    └── openstreetmap.service.ts  # OSM API integration
```

### Key Components

#### 1. EssentialMapComponent

- **Map Rendering**: Displays OpenStreetMap tiles
- **User Location**: Shows current position with GPS
- **POI Markers**: Custom markers for different POI types
- **Interactive Popups**: Detailed POI information on click
- **Real-time Updates**: Live data from OpenStreetMap

#### 2. POIFilterComponent

- **Category Filters**: Filter by restroom, ATM, water, food
- **Modal Interface**: Overlay filter panel
- **Multi-selection**: Choose multiple categories
- **Active State**: Shows selected filters with badges

#### 3. POIListComponent

- **Scrollable List**: Vertical list of nearby POIs
- **Distance Calculation**: Shows distance from user location
- **Quick Actions**: Bookmark and directions buttons
- **Rating Display**: Visual rating system
- **Empty States**: Helpful messages when no results

### Data Flow

1. **Location Detection**: Get user's current location
2. **API Query**: Fetch nearby POIs from OpenStreetMap
3. **Data Processing**: Parse and format POI data
4. **Map Rendering**: Display POIs on interactive map
5. **List Display**: Show POIs in organized list
6. **User Interaction**: Handle filtering, bookmarking, navigation

## Setup and Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# OpenStreetMap Configuration
NEXT_PUBLIC_NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org

# Default Location (Pune, India)
NEXT_PUBLIC_DEFAULT_LAT=18.5204
NEXT_PUBLIC_DEFAULT_LNG=73.8567
NEXT_PUBLIC_DEFAULT_ZOOM=13

# Development
NEXT_PUBLIC_APP_ENV=development
```

### Installation

1. **Install Dependencies**:

   ```bash
   npm install react-leaflet leaflet @types/leaflet
   ```

2. **Configure Next.js**: The feature works with Next.js App Router and requires no additional configuration.

3. **Start Development**:
   ```bash
   npm run dev
   ```

### Getting OpenStreetMap API Access

**Good News**: OpenStreetMap doesn't require API keys! The service is completely free and open.

#### Overpass API

- **What**: Query interface for OpenStreetMap data
- **Cost**: Free, no registration required
- **Limits**: Fair use policy, ~10,000 queries/day per IP
- **Endpoint**: `https://overpass-api.de/api/interpreter`

#### Nominatim API

- **What**: Geocoding service for place search
- **Cost**: Free for fair use
- **Limits**: 1 request/second for free usage
- **Endpoint**: `https://nominatim.openstreetmap.org`

#### Optional: Mapbox Integration

For enhanced tile quality and performance:

1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Get free API key (50,000 requests/month)
3. Add to `.env.local`: `NEXT_PUBLIC_MAPBOX_API_KEY=your_key_here`

## Usage

### Basic Navigation

1. **Access**: Navigate to `/essential-maps` in the app
2. **Location**: Allow location access for personalized results
3. **Explore**: Pan and zoom the map to explore different areas
4. **Filter**: Use filter buttons to show specific POI types
5. **Details**: Click POI markers or list items for more information
6. **Bookmark**: Save frequently used locations
7. **Directions**: Get navigation to selected POIs

### Advanced Features

- **Offline Mode**: View cached POIs when internet is unavailable
- **Search**: Search for specific places or addresses
- **Community**: Submit ratings and reviews for POIs
- **Share**: Share POI locations with others
- **History**: View recently visited locations

## Future Enhancements

### Planned Features

- **User Reviews**: Allow users to submit detailed reviews
- **Photo Upload**: Add photos to POI listings
- **Real-time Status**: Live status updates for facilities
- **Route Planning**: Multi-stop route optimization
- **Crowd-sourced Data**: Community-driven POI updates
- **Accessibility Info**: Detailed accessibility information
- **Multi-language**: Support for regional Indian languages

### Technical Improvements

- **Caching Strategy**: Better offline data management
- **Performance**: Optimize for low-end devices
- **PWA Features**: Push notifications for nearby POIs
- **Machine Learning**: Personalized POI recommendations
- **Analytics**: Usage tracking and optimization

## Contributing

### Adding New POI Types

1. Update the POI type union in TypeScript interfaces
2. Add new icons and styling
3. Create Overpass API queries for the new type
4. Update filter components
5. Test with real data

### Improving Accuracy

- Contribute to OpenStreetMap data quality
- Report incorrect POI information
- Submit pull requests for bug fixes
- Add unit tests for new features

## Support

For issues, feature requests, or contributions:

- Check existing issues in the project repository
- Create detailed bug reports with location data
- Suggest improvements based on user feedback
- Test the feature in different Indian cities

---

**Note**: This feature prioritizes user privacy by using open-source mapping solutions and storing minimal personal data locally on the device.
