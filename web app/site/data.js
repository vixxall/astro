/* ==========================================================================
   Astro Hub - Sample Data
   All content is static/sample data. No backend or API is used.
   This file exposes global arrays/objects used by script.js and pages.
   ========================================================================== */

/* ---------------------------- PLANETS ---------------------------- */
const PLANETS = [
  {
    id: "mercury",
    name: "Mercury",
    type: "Terrestrial Planet",
    image: "images/mercury.png",
    distance: "57.9 million km",
    diameter: "4,879 km",
    moons: 0,
    temperature: "167 °C (avg)",
    gravity: "3.7 m/s²",
    description:
      "The smallest planet in our Solar System and the closest to the Sun.",
    atmosphere:
      "Mercury has an extremely thin exosphere made of oxygen, sodium, hydrogen, helium and potassium.",
    surface:
      "Heavily cratered surface similar to the Moon, with vast smooth plains and towering cliffs called scarps.",
    orbit: "88 Earth days",
    rotation: "59 Earth days",
    facts: [
      "A day on Mercury lasts about 176 Earth days.",
      "It has no moons and no substantial atmosphere.",
      "Temperatures swing from 430 °C in daytime to -180 °C at night.",
    ],
  },
  {
    id: "venus",
    name: "Venus",
    type: "Terrestrial Planet",
    image: "images/venus.png",
    distance: "108.2 million km",
    diameter: "12,104 km",
    moons: 0,
    temperature: "464 °C (avg)",
    gravity: "8.87 m/s²",
    description:
      "The hottest planet, wrapped in thick clouds of sulfuric acid.",
    atmosphere:
      "A dense atmosphere of carbon dioxide with clouds of sulfuric acid, creating a runaway greenhouse effect.",
    surface:
      "Volcanic plains, highland regions and thousands of volcanoes hidden beneath its clouds.",
    orbit: "225 Earth days",
    rotation: "243 Earth days (retrograde)",
    facts: [
      "Venus spins backwards compared to most planets.",
      "It is the hottest planet even though Mercury is closer to the Sun.",
      "A day on Venus is longer than its year.",
    ],
  },
  {
    id: "earth",
    name: "Earth",
    type: "Terrestrial Planet",
    image: "images/earth.png",
    distance: "149.6 million km",
    diameter: "12,742 km",
    moons: 1,
    temperature: "15 °C (avg)",
    gravity: "9.8 m/s²",
    description: "Our home planet — the only known world to support life.",
    atmosphere:
      "A nitrogen and oxygen rich atmosphere that protects life and enables liquid water to exist.",
    surface:
      "Around 71% covered by oceans, with continents, mountains, forests and polar ice caps.",
    orbit: "365.25 days",
    rotation: "24 hours",
    facts: [
      "Earth is the only planet not named after a god.",
      "It has a powerful magnetic field that shields us from solar radiation.",
      "About 71% of the surface is covered by water.",
    ],
  },
  {
    id: "mars",
    name: "Mars",
    type: "Terrestrial Planet",
    image: "images/mars.png",
    distance: "227.9 million km",
    diameter: "6,779 km",
    moons: 2,
    temperature: "-63 °C (avg)",
    gravity: "3.71 m/s²",
    description: "The Red Planet, a prime target in the search for past life.",
    atmosphere:
      "A thin atmosphere of mostly carbon dioxide, which cannot retain much heat.",
    surface:
      "Rusty red deserts, the largest volcano (Olympus Mons) and the deepest canyon (Valles Marineris) in the Solar System.",
    orbit: "687 Earth days",
    rotation: "24.6 hours",
    facts: [
      "Home to Olympus Mons, the tallest volcano in the Solar System.",
      "Mars has two small moons: Phobos and Deimos.",
      "Its red color comes from iron oxide (rust) on the surface.",
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    type: "Gas Giant",
    image: "images/jupiter.png",
    distance: "778.5 million km",
    diameter: "139,820 km",
    moons: 95,
    temperature: "-110 °C (cloud top)",
    gravity: "24.79 m/s²",
    description: "The largest planet, a giant ball of gas with a Great Red Spot.",
    atmosphere:
      "Mostly hydrogen and helium with colorful bands of clouds and massive storms.",
    surface:
      "No solid surface — it is a gas giant with a possible dense core deep within.",
    orbit: "12 Earth years",
    rotation: "9.9 hours",
    facts: [
      "The Great Red Spot is a storm larger than Earth.",
      "Jupiter has the shortest day of all the planets.",
      "It has at least 95 known moons.",
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    type: "Gas Giant",
    image: "images/saturn.png",
    distance: "1.43 billion km",
    diameter: "116,460 km",
    moons: 146,
    temperature: "-140 °C (cloud top)",
    gravity: "10.44 m/s²",
    description: "Famous for its stunning and complex system of icy rings.",
    atmosphere:
      "Hydrogen and helium with faint bands and occasional large storms.",
    surface:
      "A gas giant with no true surface, surrounded by thousands of rings made of ice and rock.",
    orbit: "29 Earth years",
    rotation: "10.7 hours",
    facts: [
      "Saturn's rings are made mostly of ice and rock.",
      "It is the least dense planet — it would float in water.",
      "Saturn has 146 confirmed moons.",
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    type: "Ice Giant",
    image: "images/uranus.png",
    distance: "2.87 billion km",
    diameter: "50,724 km",
    moons: 27,
    temperature: "-195 °C (avg)",
    gravity: "8.69 m/s²",
    description: "An ice giant that rotates on its side like a rolling ball.",
    atmosphere:
      "Hydrogen, helium and methane — the methane gives it a pale blue-green color.",
    surface:
      "No solid surface; a cold, slushy interior of water, ammonia and methane ices.",
    orbit: "84 Earth years",
    rotation: "17 hours (retrograde)",
    facts: [
      "Uranus rotates on its side with a 98° tilt.",
      "It was the first planet discovered with a telescope.",
      "Its blue-green color comes from methane gas.",
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    type: "Ice Giant",
    image: "images/neptune.png",
    distance: "4.5 billion km",
    diameter: "49,244 km",
    moons: 14,
    temperature: "-200 °C (avg)",
    gravity: "11.15 m/s²",
    description: "The most distant planet, known for supersonic winds.",
    atmosphere:
      "Hydrogen, helium and methane with the fastest winds in the Solar System.",
    surface:
      "A deep blue ice giant with no solid surface and violent storm systems.",
    orbit: "165 Earth years",
    rotation: "16 hours",
    facts: [
      "Neptune has the strongest winds, reaching 2,100 km/h.",
      "It was the first planet found using mathematical prediction.",
      "One Neptune year equals 165 Earth years.",
    ],
  },
];

/* ---------------------------- STARS ---------------------------- */
const STARS = [
  {
    id: "sun",
    name: "Sun",
    type: "G-type Main-Sequence Star (Yellow Dwarf)",
    image: "images/star-sun.png",
    constellation: "None (Solar System center)",
    distance: "149.6 million km (8 light-minutes)",
    temperature: "5,500 °C (surface)",
    size: "1,391,000 km diameter",
    color: "Yellow-White",
    description:
      "The star at the center of our Solar System and the source of nearly all energy on Earth.",
    formation:
      "The Sun formed about 4.6 billion years ago from the gravitational collapse of a giant molecular cloud of gas and dust.",
    lifecycle:
      "It is roughly halfway through its main-sequence life. In about 5 billion years it will swell into a red giant, then shed its layers and become a white dwarf.",
    facts: [
      "The Sun contains 99.8% of all the mass in the Solar System.",
      "About 1 million Earths could fit inside the Sun.",
      "Light from the Sun takes about 8 minutes to reach Earth.",
    ],
    related: ["images/star-betelgeuse.png", "images/star-vega.png", "images/nebula.png"],
  },
  {
    id: "sirius",
    name: "Sirius",
    type: "Main-Sequence Star (A-type)",
    image: "images/star-sirius.png",
    constellation: "Canis Major",
    distance: "8.6 light-years",
    temperature: "9,940 °C (surface)",
    size: "1.7× the Sun's diameter",
    color: "Blue-White",
    description:
      "The brightest star in Earth's night sky, also known as the Dog Star.",
    formation:
      "Sirius formed around 240 million years ago and is part of a binary system with a white dwarf companion called Sirius B.",
    lifecycle:
      "Sirius A is a young main-sequence star. It will eventually expand into a red giant before ending as a white dwarf, much like its companion already has.",
    facts: [
      "Sirius is nearly twice as massive as the Sun.",
      "It has a faint white dwarf companion, Sirius B, nicknamed 'the Pup'.",
      "Ancient Egyptians used its rising to predict the flooding of the Nile.",
    ],
    related: ["images/star-rigel.png", "images/star-vega.png", "images/galaxy.png"],
  },
  {
    id: "polaris",
    name: "Polaris (North Star)",
    type: "Yellow Supergiant (Cepheid Variable)",
    image: "images/star-polaris.png",
    constellation: "Ursa Minor",
    distance: "433 light-years",
    temperature: "6,000 °C (surface)",
    size: "37× the Sun's diameter",
    color: "Yellow-White",
    description:
      "The current North Star, sitting almost directly above Earth's north pole.",
    formation:
      "Polaris is an evolved supergiant that formed from a massive gas cloud and has since expanded far beyond its original size.",
    lifecycle:
      "As a Cepheid variable, it pulses in brightness. It is nearing the later stages of its life and will eventually explode as a supernova.",
    facts: [
      "Polaris appears nearly fixed in the sky as Earth rotates.",
      "It is actually a triple star system.",
      "It has guided navigators and travelers for thousands of years.",
    ],
    related: ["images/star-sun.png", "images/star-betelgeuse.png", "images/nebula.png"],
  },
  {
    id: "betelgeuse",
    name: "Betelgeuse",
    type: "Red Supergiant",
    image: "images/star-betelgeuse.png",
    constellation: "Orion",
    distance: "642 light-years",
    temperature: "3,300 °C (surface)",
    size: "About 700× the Sun's diameter",
    color: "Red-Orange",
    description:
      "A colossal red supergiant marking the shoulder of the constellation Orion.",
    formation:
      "Betelgeuse formed only about 10 million years ago but burned through its fuel rapidly because of its enormous mass.",
    lifecycle:
      "It is in the final stages of its life and is expected to explode as a spectacular supernova within the next 100,000 years.",
    facts: [
      "If placed at the Sun's position, it would engulf Mars' orbit.",
      "Its brightness noticeably dims and brightens over time.",
      "When it explodes, it may be visible even during the daytime.",
    ],
    related: ["images/star-rigel.png", "images/star-sun.png", "images/blackhole.png"],
  },
  {
    id: "rigel",
    name: "Rigel",
    type: "Blue Supergiant",
    image: "images/star-rigel.png",
    constellation: "Orion",
    distance: "860 light-years",
    temperature: "12,100 °C (surface)",
    size: "About 78× the Sun's diameter",
    color: "Blue-White",
    description:
      "A brilliant blue supergiant and the brightest star in the constellation Orion.",
    formation:
      "Rigel formed from a massive molecular cloud roughly 8 million years ago and shines with immense luminosity.",
    lifecycle:
      "This young but massive star will end its life in a violent supernova, possibly leaving behind a neutron star.",
    facts: [
      "Rigel is about 120,000 times more luminous than the Sun.",
      "It is part of a multiple star system.",
      "Despite being farther than Betelgeuse, it usually looks brighter.",
    ],
    related: ["images/star-betelgeuse.png", "images/star-sirius.png", "images/galaxy.png"],
  },
  {
    id: "vega",
    name: "Vega",
    type: "Main-Sequence Star (A-type)",
    image: "images/star-vega.png",
    constellation: "Lyra",
    distance: "25 light-years",
    temperature: "9,300 °C (surface)",
    size: "2.4× the Sun's diameter",
    color: "Blue-White",
    description:
      "A bright nearby star that was the first (after the Sun) to be photographed.",
    formation:
      "Vega formed about 455 million years ago and is surrounded by a disk of dust that may host forming planets.",
    lifecycle:
      "Vega is a relatively young main-sequence star that will one day swell into a red giant and then fade to a white dwarf.",
    facts: [
      "Vega will become the North Star around the year 13,700 due to Earth's wobble.",
      "It rotates so fast that it bulges at its equator.",
      "It was one of the first stars to have its distance measured.",
    ],
    related: ["images/star-sirius.png", "images/star-sun.png", "images/nebula.png"],
  },
];

/* ---------------------------- SPACE MISSIONS ---------------------------- */
const MISSIONS = [
  { id: "apollo11", name: "Apollo 11", agency: "NASA", launch: "July 16, 1969", destination: "The Moon", status: "Completed", image: "images/fa08f6dd252b806c90f1e1e0ad70b2df.jpg", description: "The first mission to land humans on the Moon, with Neil Armstrong and Buzz Aldrin." },
  { id: "apollo13", name: "Apollo 13", agency: "NASA", launch: "April 11, 1970", destination: "The Moon", status: "Completed", image: "images/rocket.png", description: "A lunar mission aborted after an oxygen tank exploded — a story of survival and ingenuity." },
  { id: "artemis1", name: "Artemis I", agency: "NASA", launch: "Nov 16, 2022", destination: "The Moon", status: "Completed", image: "images/rocket.png", description: "An uncrewed test flight of the Orion spacecraft around the Moon, kicking off the Artemis program." },
  { id: "voyager1", name: "Voyager 1", agency: "NASA", launch: "Sept 5, 1977", destination: "Interstellar Space", status: "Ongoing", image: "images/0e0d38115e728c20f48cbaf27ac774c2.jpg", description: "The most distant human-made object, now traveling through interstellar space." },
  { id: "voyager2", name: "Voyager 2", agency: "NASA", launch: "Aug 20, 1977", destination: "Interstellar Space", status: "Ongoing", image: "images/spacecraft.png", description: "The only spacecraft to visit all four giant planets: Jupiter, Saturn, Uranus and Neptune." },
  { id: "curiosity", name: "Curiosity Rover", agency: "NASA", launch: "Nov 26, 2011", destination: "Mars", status: "Active", image: "images/rover.png", description: "A car-sized rover exploring Gale Crater and studying Mars' climate and geology." },
  { id: "perseverance", name: "Perseverance Rover", agency: "NASA", launch: "July 30, 2020", destination: "Mars", status: "Active", image: "images/rover.png", description: "Searching for signs of ancient life and collecting samples in Jezero Crater." },
  { id: "opportunity", name: "Opportunity Rover", agency: "NASA", launch: "July 7, 2003", destination: "Mars", status: "Completed", image: "images/rover.png", description: "A rover that operated for nearly 15 years, far beyond its planned 90-day mission." },
  { id: "jwst", name: "James Webb Space Telescope", agency: "NASA / ESA / CSA", launch: "Dec 25, 2021", destination: "L2 Orbit", status: "Active", image: "images/telescope.png", description: "The most powerful space telescope, peering into the earliest galaxies of the universe." },
  { id: "hubble", name: "Hubble Space Telescope", agency: "NASA / ESA", launch: "April 24, 1990", destination: "Earth Orbit", status: "Active", image: "images/df0ca579ca698a19acf420f64cd6ebba.jpg", description: "A legendary telescope that has transformed our view of the cosmos for over 30 years." },
  { id: "cassini", name: "Cassini-Huygens", agency: "NASA / ESA / ASI", launch: "Oct 15, 1997", destination: "Saturn", status: "Completed", image: "images/spacecraft.png", description: "Studied Saturn and its moons for 13 years before its grand finale dive into the planet." },
  { id: "juno", name: "Juno", agency: "NASA", launch: "Aug 5, 2011", destination: "Jupiter", status: "Active", image: "images/spacecraft.png", description: "Orbiting Jupiter to study its origins, atmosphere and powerful magnetic field." },
  { id: "newhorizons", name: "New Horizons", agency: "NASA", launch: "Jan 19, 2006", destination: "Pluto & Kuiper Belt", status: "Ongoing", image: "images/spacecraft.png", description: "Gave us the first close-up images of Pluto in 2015 and continues into the Kuiper Belt." },
  { id: "chandrayaan1", name: "Chandrayaan-1", agency: "ISRO", launch: "Oct 22, 2008", destination: "The Moon", status: "Completed", image: "images/spacecraft.png", description: "India's first lunar mission, which helped confirm water molecules on the Moon." },
  { id: "chandrayaan2", name: "Chandrayaan-2", agency: "ISRO", launch: "July 22, 2019", destination: "The Moon", status: "Ongoing", image: "images/spacecraft.png", description: "An orbiter, lander and rover mission; the orbiter continues to study the Moon." },
  { id: "chandrayaan3", name: "Chandrayaan-3", agency: "ISRO", launch: "July 14, 2023", destination: "The Moon (South Pole)", status: "Completed", image: "images/c58d689ed217f76b3e526754e88cf9d1.jpg", description: "Made India the first nation to land near the lunar south pole with the Vikram lander." },
  { id: "mangalyaan-featured", name: "Mangalyaan", agency: "ISRO", launch: "Nov 5, 2013", destination: "Mars", status: "Completed", image: "images/960px-Mars_Orbiter_Mission_Over_Mars_(15237158879).jpg", description: "India's first interplanetary mission â€” successful on its very first attempt." },
  { id: "mangalyaan", name: "Mangalyaan (MOM)", agency: "ISRO", launch: "Nov 5, 2013", destination: "Mars", status: "Completed", image: "images/rover.png", description: "India's first interplanetary mission — successful on its very first attempt." },
  { id: "adityal1", name: "Aditya-L1", agency: "ISRO", launch: "Sept 2, 2023", destination: "Sun (L1 Point)", status: "Active", image: "images/Screenshot 2026-07-10 191516.png", description: "India's first mission to study the Sun from the Sun-Earth L1 Lagrange point." },
  { id: "gaganyaan", name: "Gaganyaan", agency: "ISRO", launch: "Planned", destination: "Earth Orbit", status: "Ongoing", image: "images/rocket.png", description: "India's first crewed spaceflight program, aiming to send astronauts into orbit." },
];

/* ---------------------------- NASA GALLERY ---------------------------- */
const GALLERY = [
  { title: "Spiral Galaxy", category: "Galaxies", image: "images/galaxy.png", description: "A majestic spiral galaxy with billions of stars swirling around a bright core." },
  { title: "Cosmic Nebula", category: "Nebulae", image: "images/nebula.png", description: "Glowing clouds of gas and dust where new stars are born." },
  { title: "The Moon", category: "Moon", image: "images/moon.png", description: "Earth's only natural satellite, covered in craters and dusty plains." },
  { title: "Astronaut in Orbit", category: "Astronauts", image: "images/astronaut.png", description: "An astronaut floating in space during an extravehicular activity." },
  { title: "Black Hole", category: "Black Holes", image: "images/blackhole.png", description: "A region of spacetime where gravity is so strong that not even light escapes." },
  { title: "Deep Space Probe", category: "Spacecraft", image: "images/spacecraft.png", description: "A robotic probe exploring the far reaches of the Solar System." },
  { title: "Planet Earth", category: "Earth", image: "images/earth.png", description: "Our blue home planet seen from orbit, wrapped in swirling clouds." },
  { title: "Planet Mars", category: "Mars", image: "images/mars.png", description: "The rusty red surface of Mars, a world of deserts and ancient riverbeds." },
  { title: "Planet Jupiter", category: "Planets", image: "images/jupiter.png", description: "The banded clouds and giant storms of the largest planet." },
  { title: "Planet Saturn", category: "Planets", image: "images/saturn.png", description: "The glorious ringed planet, an icon of the Solar System." },
  { title: "Mars Rover", category: "Spacecraft", image: "images/rover.png", description: "A rover trundling across the Martian landscape collecting data." },
  { title: "Space Telescope", category: "Spacecraft", image: "images/telescope.png", description: "A powerful observatory peering into the depths of the universe." },
  { title: "The Sun's Neighbor Star", category: "Stars", image: "images/nebula.png", description: "A brilliant star surrounded by colorful glowing gas." },
  { title: "Rocket Launch", category: "Spacecraft", image: "images/rocket.png", description: "A powerful rocket blasting off toward the stars." },
  { title: "Venus Clouds", category: "Planets", image: "images/venus.png", description: "The thick, hot cloud layers that shroud the planet Venus." },
  { title: "Mercury Crater Plains", category: "Planets", image: "images/mercury.png", description: "A close look at Mercury's cratered surface, shaped by billions of years of impacts." },
  { title: "Uranus Ice Giant", category: "Planets", image: "images/uranus.png", description: "The pale blue-green ice giant, tilted dramatically as it travels around the Sun." },
  { title: "Neptune's Blue World", category: "Planets", image: "images/neptune.png", description: "A deep blue planet known for fierce winds and distant sunlight." },
  { title: "Solar System Panorama", category: "Planets", image: "images/solar-system-3840x2160-12831.jpg", description: "A wide view of the Solar System, from rocky inner worlds to distant ice giants." },
  { title: "Moonlit Crater Fields", category: "Moon", image: "images/moon.png", description: "Craters, maria and bright highlands reveal the Moon's ancient impact history." },
  { title: "Earth From Space", category: "Earth", image: "images/ca1ad54ac5ac2a8582640a7759de9244.jpg", description: "A sweeping orbital view of Earth, with clouds, oceans and continents glowing in sunlight." },
  { title: "Blue Marble View", category: "Earth", image: "images/df0ca579ca698a19acf420f64cd6ebba.jpg", description: "Earth appears as a fragile blue world against the darkness of space." },
  { title: "Mars Orbiter View", category: "Mars", image: "images/960px-Mars_Orbiter_Mission_Over_Mars_(15237158879).jpg", description: "A spacecraft's view of Mars, the red planet that continues to inspire exploration." },
  { title: "Martian Desert", category: "Mars", image: "images/c58d689ed217f76b3e526754e88cf9d1.jpg", description: "Rust-colored terrain hints at Mars' volcanic past and vanished water systems." },
  { title: "Hubble Deep Space", category: "Galaxies", image: "images/b2bb44a72b311fead9c7dcecdd20ea59.jpg", description: "A deep-space scene packed with distant galaxies and ancient starlight." },
  { title: "Galaxy Cluster", category: "Galaxies", image: "images/48264704227-429c94870f-4k.jpg", description: "Galaxies gather in a vast cosmic neighborhood shaped by gravity." },
  { title: "Colorful Star Nursery", category: "Nebulae", image: "images/STScI-01GA6KNV1S3TP2JBPCDT8G826T.png", description: "Gas and dust glow in a stellar nursery where young stars are forming." },
  { title: "Nebula Clouds", category: "Nebulae", image: "images/8a09d8255c9be4664f30a3859699fe8a.jpg", description: "Luminous clouds of hydrogen, dust and newborn stars stretch across space." },
  { title: "Vega Star", category: "Stars", image: "images/star-vega.png", description: "A bright blue-white star and one of the most studied stars in the night sky." },
  { title: "Sirius Star", category: "Stars", image: "images/star-sirius.png", description: "The brightest star visible from Earth, shining from the constellation Canis Major." },
  { title: "Betelgeuse Red Supergiant", category: "Stars", image: "images/star-betelgeuse.png", description: "A huge red supergiant nearing the final stages of its stellar life." },
  { title: "Rigel Blue Supergiant", category: "Stars", image: "images/star-rigel.png", description: "A brilliant blue supergiant star lighting up the constellation Orion." },
  { title: "Spacewalk Moment", category: "Astronauts", image: "images/astronaut.png", description: "An astronaut works beyond the spacecraft, protected by a suit built for vacuum." },
  { title: "Launch Vehicle", category: "Spacecraft", image: "images/rocket.png", description: "A rocket climbs through the atmosphere on its way to orbit." },
  { title: "Robotic Explorer", category: "Spacecraft", image: "images/rover.png", description: "A robotic rover studies another world one careful wheel track at a time." },
  { title: "Accretion Disk", category: "Black Holes", image: "images/blackhole.png", description: "Matter swirls around an extreme gravity well before crossing the point of no return." },
];

const GALLERY_CATEGORIES = [
  "Planets", "Galaxies", "Nebulae", "Stars", "Moon",
  "Earth", "Mars", "Spacecraft", "Astronauts", "Black Holes",
];

/* ---------------------------- QUIZ QUESTIONS ---------------------------- */
const QUIZ = [
  {
    category: "Solar System",
    q: "Which is the largest planet in our Solar System?",
    options: ["Earth", "Saturn", "Jupiter", "Neptune"],
    answer: 2,
    hint: "It is a gas giant famous for its Giant Red Spot.",
    explanation: "Jupiter is a gas giant with a mass more than two and a half times that of all the other planets in our Solar System combined."
  },
  {
    category: "Planets",
    q: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Mercury", "Jupiter"],
    answer: 1,
    hint: "It is named after the Roman god of war and has iron oxide (rust) on its surface.",
    explanation: "Mars appears red due to the high concentration of iron oxide (rust) on its surface and in its thin atmosphere."
  },
  {
    category: "Solar System",
    q: "How many planets are in our Solar System?",
    options: ["7", "8", "9", "10"],
    answer: 1,
    hint: "Pluto was reclassified as a dwarf planet in 2006.",
    explanation: "Our Solar System has 8 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. Pluto was reclassified as a dwarf planet in 2006."
  },
  {
    category: "Stars",
    q: "What is the closest star to Earth?",
    options: ["Sirius", "Alpha Centauri", "The Sun", "Polaris"],
    answer: 2,
    hint: "It is the center of our Solar System and provides all our light and heat.",
    explanation: "The Sun is the closest star to Earth, located about 93 million miles (150 million km) away. Alpha Centauri is the closest star system, but not the closest star."
  },
  {
    category: "Planets",
    q: "Which planet has the most prominent ring system?",
    options: ["Jupiter", "Uranus", "Saturn", "Neptune"],
    answer: 2,
    hint: "It has spectacular, wide rings made of billions of ice and rock particles.",
    explanation: "While all gas giants in our Solar System have ring systems, Saturn's rings are by far the largest, brightest, and most spectacular."
  },
  {
    category: "NASA",
    q: "Which NASA mission first landed humans on the Moon?",
    options: ["Apollo 13", "Apollo 11", "Artemis I", "Gemini 4"],
    answer: 1,
    hint: "Led by Neil Armstrong and Buzz Aldrin in July 1969.",
    explanation: "NASA's Apollo 11 mission successfully landed astronauts Neil Armstrong and Buzz Aldrin on the Moon on July 20, 1969."
  },
  {
    category: "ISRO",
    q: "Which ISRO mission landed near the Moon's south pole in 2023?",
    options: ["Chandrayaan-1", "Mangalyaan", "Chandrayaan-3", "Aditya-L1"],
    answer: 2,
    hint: "Its landing spot was named Shiv Shakti Point.",
    explanation: "ISRO's Chandrayaan-3 successfully touched down near the lunar south pole in August 2023, making India the first country to land in that region."
  },
  {
    category: "Galaxies",
    q: "What galaxy do we live in?",
    options: ["Andromeda", "Whirlpool", "The Milky Way", "Triangulum"],
    answer: 2,
    hint: "It gets its name from its appearance as a dim, milky band of light stretching across the night sky.",
    explanation: "Our Solar System resides in the Milky Way, a barred spiral galaxy containing 100 to 400 billion stars."
  },
  {
    category: "Black Holes",
    q: "What is the boundary of a black hole called?",
    options: ["Event Horizon", "Photosphere", "Corona", "Singularity Line"],
    answer: 0,
    hint: "It is the absolute boundary where escape velocity equals the speed of light—the point of no return.",
    explanation: "The event horizon is the outer boundary of a black hole where gravity is so strong that nothing, not even light, can escape."
  },
  {
    category: "Planets",
    q: "Which is the hottest planet in the Solar System?",
    options: ["Mercury", "Venus", "Mars", "Jupiter"],
    answer: 1,
    hint: "Its dense atmosphere of carbon dioxide traps heat in a runaway greenhouse effect.",
    explanation: "Venus is the hottest planet in our Solar System, with surface temperatures of 462°C (864°F), hotter than Mercury due to its runaway greenhouse effect."
  },
  {
    category: "Space Missions",
    q: "Which spacecraft is the most distant human-made object?",
    options: ["Voyager 2", "New Horizons", "Voyager 1", "Juno"],
    answer: 2,
    hint: "Launched in 1977, it is currently traveling through interstellar space.",
    explanation: "Voyager 1 was launched in 1977, entered interstellar space in 2012, and is currently the farthest human-made object from Earth."
  },
  {
    category: "NASA",
    q: "What is the most powerful space telescope launched in 2021?",
    options: ["Hubble", "Kepler", "James Webb", "Spitzer"],
    answer: 2,
    hint: "It is an infrared telescope with a large gold-coated hexagonal primary mirror.",
    explanation: "The James Webb Space Telescope (JWST) was launched on December 25, 2021, and is designed to conduct infrared astronomy."
  },
  {
    category: "ISRO",
    q: "What was India's first mission to Mars called?",
    options: ["Chandrayaan", "Mangalyaan", "Gaganyaan", "Aditya"],
    answer: 1,
    hint: "Also known as the Mars Orbiter Mission (MOM), launched in 2013.",
    explanation: "India's Mangalyaan (Mars Orbiter Mission) successfully entered Mars orbit in 2014, making ISRO the first agency to reach Mars on its first attempt."
  },
  {
    category: "Solar System",
    q: "Which planet rotates on its side?",
    options: ["Neptune", "Saturn", "Uranus", "Venus"],
    answer: 2,
    hint: "Its axis of rotation is tilted by nearly 98 degrees, likely due to a giant collision.",
    explanation: "Uranus is unique because it rotates on its side, with its poles facing the Sun, possibly caused by a collision with a Earth-sized protoplanet."
  },
  {
    category: "Stars",
    q: "What do we call a star that explodes at the end of its life?",
    options: ["Quasar", "Supernova", "Pulsar", "Nebula"],
    answer: 1,
    hint: "This catastrophic explosion briefly outshines entire galaxies.",
    explanation: "A supernova is a stellar explosion that occurs at the end of a high-mass star's life cycle, releasing massive amounts of energy and heavy elements."
  },
  {
    category: "Planets",
    q: "Which planet has the strongest winds in the Solar System?",
    options: ["Jupiter", "Saturn", "Neptune", "Mars"],
    answer: 2,
    hint: "It is the outermost gas giant and has a deep blue hue.",
    explanation: "Neptune has the fastest winds in the Solar System, reaching speeds of up to 2,100 kilometers per hour (1,300 miles per hour)."
  },
  {
    category: "Space Missions",
    q: "Which mission studies Jupiter up close?",
    options: ["Cassini", "Juno", "New Horizons", "Voyager 1"],
    answer: 1,
    hint: "It is named after the Roman goddess who was the wife of Jupiter.",
    explanation: "NASA's Juno spacecraft entered orbit around Jupiter in July 2016 to study the planet's atmospheric composition, magnetic field, and core."
  },
  {
    category: "Galaxies",
    q: "Approximately how many stars are in the Milky Way?",
    options: ["1 million", "100 billion", "500", "1 trillion trillion"],
    answer: 1,
    hint: "A number represented as 1 followed by eleven zeros.",
    explanation: "Astronomers estimate that the Milky Way contains between 100 billion and 400 billion stars, along with billions of planets."
  },
  {
    category: "Black Holes",
    q: "The point of infinite density inside a black hole is the:",
    options: ["Horizon", "Singularity", "Accretion disk", "Jet"],
    answer: 1,
    hint: "It lies at the very center where standard physics and space-time break down.",
    explanation: "The singularity is a point of infinite density at the center of a black hole where gravity is infinitely strong and space-time ceases to exist as we know it."
  },
  {
    category: "NASA",
    q: "Which spacecraft explored Saturn and its moon Titan?",
    options: ["Cassini-Huygens", "Galileo", "Juno", "Pioneer"],
    answer: 0,
    hint: "A joint project between NASA, ESA, and ASI that orbited Saturn from 2004 to 2017.",
    explanation: "The Cassini-Huygens mission spent 13 years orbiting Saturn, studying its ring system, and deployed the Huygens probe onto Titan's surface."
  }
];
