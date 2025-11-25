export interface Movie {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  subtitleUrl?: string;
  duration: string;
  genre: string;
  year: number;
}

export const movies: Movie[] = [
  {
    id: "sintel",
    title: "Sintel",
    description: "A young woman named Sintel searches for her pet dragon, Scales, after it was taken by an adult dragon.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    subtitleUrl: "/subtitles/sintel-id.vtt",
    duration: "14:48",
    genre: "Fantasy",
    year: 2010,
  },
  {
    id: "bigbuckbunny",
    title: "Big Buck Bunny",
    description: "A large and lovable rabbit deals with three tiny bullies, led by a flying squirrel, who are determined to squelch his happiness.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    duration: "9:56",
    genre: "Comedy",
    year: 2008,
  },
  {
    id: "tearsofsteel",
    title: "Tears of Steel",
    description: "In a post-apocalyptic future, a group of soldiers and scientists must defend the last remnant of humanity.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    duration: "12:14",
    genre: "Sci-Fi",
    year: 2012,
  },
  {
    id: "elephantsdream",
    title: "Elephants Dream",
    description: "Two strange characters explore a surreal world inside an enormous machine.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    duration: "10:53",
    genre: "Fantasy",
    year: 2006,
  },
  {
    id: "forbiggerfun",
    title: "For Bigger Fun",
    description: "A whimsical animated adventure about finding joy in the simple things in life.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    duration: "1:00",
    genre: "Animation",
    year: 2015,
  },
  {
    id: "forbiggerblazes",
    title: "For Bigger Blazes",
    description: "An action-packed adventure with stunning visual effects and thrilling sequences.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    duration: "0:15",
    genre: "Action",
    year: 2015,
  },
  {
    id: "forbiggerescape",
    title: "For Bigger Escape",
    description: "A thrilling escape story that will keep you on the edge of your seat.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    duration: "0:15",
    genre: "Adventure",
    year: 2015,
  },
  {
    id: "forbiggerjoyrides",
    title: "For Bigger Joyrides",
    description: "Experience the ultimate joyride with breathtaking scenery and exciting moments.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    duration: "0:15",
    genre: "Adventure",
    year: 2015,
  },
  {
    id: "forbiggermeltdowns",
    title: "For Bigger Meltdowns",
    description: "A dramatic story of tension and resolution with powerful performances.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    duration: "0:15",
    genre: "Drama",
    year: 2015,
  },
  {
    id: "subaru",
    title: "Subaru Outback",
    description: "A stunning showcase of the Subaru Outback in beautiful natural environments.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    duration: "0:30",
    genre: "Documentary",
    year: 2016,
  },
  {
    id: "volkswagen",
    title: "Volkswagen GTI",
    description: "Experience the power and elegance of the Volkswagen GTI in action.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/VolkswagenGTIReview.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",
    duration: "0:20",
    genre: "Documentary",
    year: 2016,
  },
  {
    id: "wearegoingonbullrun",
    title: "We Are Going On Bullrun",
    description: "Join the exciting journey of the Bullrun rally across America.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/WeAreGoingOnBullrun.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
    duration: "0:30",
    genre: "Documentary",
    year: 2016,
  },
  {
    id: "whatcarcan",
    title: "What Car Can You Get",
    description: "Explore different car options and find the perfect match for your lifestyle.",
    thumbnail: "https://storage.googleapis.com/gtv-videos-bucket/sample/images/WhatCarCanYouGetForAGrand.jpg",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
    duration: "3:00",
    genre: "Documentary",
    year: 2016,
  },
];

export function getMovieById(id: string): Movie | undefined {
  return movies.find((movie) => movie.id === id);
}
