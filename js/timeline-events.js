function createTimelineEvents() {
  const bp = age => 1950 - age;
  const date = decimalYearFromYmd;
  const definitions = [];
  const band = (name, start, end, description, page, options = {}) =>
    definitions.push({ type: 0, name, start, end, description, page, approximate: true, ...options });
  const point = (name, start, description, page, options = {}) =>
    definitions.push({ type: 1, name, start, end: start, description, page, ...options });

  band('Age of the Universe', currentYear - 13800000000, currentYear,
    'The time since the early hot, expanding universe. This age is estimated from cosmological observations.',
    'Age_of_the_universe', { ongoing: true });
  band('Age of Earth', bp(4540000000), currentYear,
    'Earth formed as material gathered around the young Sun. Its age is estimated from radiometric dating.',
    'Age_of_Earth', { ongoing: true });
  band('Water on Earth', bp(4400000000), currentYear,
    'Ancient zircon minerals suggest liquid water was present this early. This is evidence of water, not an exact date for the first oceans.',
    'Origin_of_water_on_Earth', { ongoing: true });
  band('Single-celled life on Earth', bp(3800000000), currentYear,
    'Early evidence of microbial life. The oldest claimed traces and their interpretation remain debated.',
    'Earliest_known_life_forms', { ongoing: true });
  band('Multicellular life on Earth', bp(3250000000), currentYear,
    'Early multicellular organization in microbial communities. Complex plants and animals evolved much later; evidence and definitions vary.',
    'Multicellular_organism', { ongoing: true });
  band('Dinosaurs', bp(230000000), bp(66000000),
    'The band follows non-avian dinosaurs, from their early fossils to the end-Cretaceous extinction. Birds are surviving dinosaurs.',
    'Dinosaur');

  band('Australopithecus', bp(4200000), bp(1200000),
    'A group of early human relatives in Africa. The band spans the approximate fossil record of the genus.', 'Australopithecus');
  band('Homo habilis', bp(2400000), bp(1400000),
    'An early human species known from African fossils. Its dates and the classification of some fossils are uncertain.', 'Homo_habilis');
  band('Homo erectus', bp(2000000), bp(100000),
    'An early human species that spread beyond Africa. The band shows a rounded range of its fossil record.', 'Homo_erectus');
  band('Homo sapiens', bp(300000), currentYear,
    'Our species has existed for roughly 300,000 years. This is an estimate from fossils, not a single moment when modern humans appeared.',
    'Homo_sapiens', { ongoing: true });
  band('Agricultural Revolution', -9999, -3999,
    'The gradual development and spread of farming. The band is a broad guide: agriculture began at different times in different regions.', 'Neolithic_Revolution');
  band('Written records', -3499, currentYear,
    'Early writing systems developed in the ancient Near East. Writing arose independently elsewhere; this band follows written records to the present.',
    'History_of_writing', { ongoing: true });
  band('Life of Confucius', -550, -478,
    'A Chinese thinker whose teachings influenced philosophy and society. These are the traditional dates of his life.', 'Confucius');
  band('Life of Muhammad', 570, 632,
    'The founder of Islam. His birth year is estimated; the band shows the commonly given lifespan.', 'Muhammad');
  band('Life of Jesus', -3, 30,
    'The central figure of Christianity. Estimates of his birth and death vary; the band uses one commonly cited range.', 'Chronology_of_Jesus');
  band('Crusades', 1095, 1291,
    'The main sequence of crusades to the eastern Mediterranean. Other campaigns called crusades took place outside this period.', 'Crusades');
  band('European Colonization', 1492, 1975,
    'A broad span from European expansion in the Americas to the main twentieth-century wave of decolonization. Dates vary by region; colonial territories and lasting effects remain.', 'Colonialism');
  band('Industrial Revolution', 1760, 1840,
    'The early shift to machine production, beginning in Britain. Industrialization continued and spread beyond this approximate period.', 'Industrial_Revolution');
  band('WWI', date(1914, 7, 28), date(1918, 11, 11),
    'World War I, from the first declaration of war to the armistice ending the main fighting. Peace treaties followed.',
    'World_War_I', { title: 'World War I', approximate: false, exactDate: true });
  band('WWII', date(1939, 9, 1), date(1945, 9, 2),
    'World War II, using the conventional dates from the invasion of Poland to Japan\'s formal surrender. Conflict in Asia began earlier.',
    'World_War_II', { title: 'World War II', approximate: false, exactDate: true });
  band('Cold War', 1947, 1991,
    'The prolonged rivalry between the United States and the Soviet Union and their allies. Its beginning is defined differently by different historians.', 'Cold_War');
  band('World Wide Web', 1989, currentYear,
    'Tim Berners-Lee proposed the Web in 1989. The Web is a way to link and access information over the Internet, which developed earlier.',
    'World_Wide_Web', { ongoing: true, approximate: false });

  point('Big Bang', currentYear - 13800000000,
    'The early hot, dense phase from which the universe expanded. This marker does not establish whether time itself had a beginning.',
    'Big_Bang', { approximate: true });
  point('Formation of the Moon', bp(4500000000),
    'The Moon likely formed after a giant collision involving the young Earth. Its age and the details of its formation are still studied.',
    'Origin_of_the_Moon', { approximate: true });
  point('Pangaea breaks apart', bp(175000000),
    'The supercontinent separated gradually as tectonic plates moved. This marker represents part of a long breakup, not a single event.',
    'Pangaea', { approximate: true });
  point('Stone Tools', bp(3300000),
    'Stone tools found at Lomekwi in Kenya are about 3.3 million years old. This dates surviving evidence, not the first use of any tool.',
    'Lomekwi', { approximate: true });
  point('Fire', bp(1000000),
    'Evidence suggests early humans used fire around this time. Controlled and habitual fire use developed gradually, and the earliest evidence is debated.',
    'Control_of_fire_by_early_humans', { approximate: true });
  point('Wheel', -3499,
    'Wheeled transport appears in archaeological evidence around this time. Pottery wheels and other uses have their own histories.',
    'Wheel', { approximate: true });
  point('Great Pyramid of Giza', -2559,
    'Built in ancient Egypt during the reign of Khufu. Its construction dates are estimated from archaeological and historical evidence.',
    'Great_Pyramid_of_Giza', { approximate: true });
  point('Iron Tools', -1199,
    'Iron tools became more widespread around the start of the Iron Age in parts of the Near East. Ironworking began earlier and spread at different times.',
    'Iron_Age', { approximate: true });
  point('Printing Press', 1450,
    'Gutenberg developed movable-metal-type printing in Europe around this time. Printing and movable type already had earlier histories in Asia.',
    'Printing_press', { approximate: true });
  point('Calculus', 1665,
    'Newton began developing calculus in the 1660s; Leibniz developed it independently. Their work built on much earlier mathematical ideas.',
    'History_of_calculus', { approximate: true });
  point('Battery', 1800,
    'Alessandro Volta introduced the voltaic pile, an early battery that supplied a continuous electric current.', 'Alessandro_Volta');
  point('Telegraph', 1837,
    'Practical electric telegraph systems were developed in Britain and the United States. Earlier experiments preceded these systems.', 'Electrical_telegraph');
  point('Theory of Evolution', date(1859, 11, 24),
    'Darwin published On the Origin of Species, explaining evolution through natural selection. Wallace had independently developed a similar idea.',
    'On_the_Origin_of_Species', { exactDate: true });
  point('Car', date(1886, 1, 29),
    'Karl Benz patented his petrol-powered motor car. This marker refers to that milestone, not all earlier self-propelled vehicles.',
    'Benz_Patent-Motorwagen', { exactDate: true });
  point('Airplane', date(1903, 12, 17),
    'The Wright brothers made sustained, controlled powered flights at Kitty Hawk. Earlier gliders and flight experiments came before them.',
    'Wright_brothers', { exactDate: true });
  point('Television', 1927,
    'Philo Farnsworth demonstrated an electronic television system. Mechanical television and other experiments had already been developed.', 'History_of_television');
  point('Computer', 1938,
    'Konrad Zuse completed the Z1, an early programmable mechanical computer. Computing has many earlier and later milestones.', 'Z1_(computer)');
  point('Transistor', date(1947, 12, 16),
    'Researchers at Bell Labs obtained amplification with a point-contact transistor. A demonstration to colleagues followed on 23 December.',
    'History_of_the_transistor', { exactDate: true });
  point('Moon Landing', date(1969, 7, 20),
    'Apollo 11 made the first crewed landing on the Moon. Armstrong and Aldrin explored the surface while Collins remained in lunar orbit.',
    'Apollo_11', { exactDate: true });
  point('Fall of Berlin Wall', date(1989, 11, 9),
    'East Germany opened border crossings through the Berlin Wall, a major milestone in the end of the Cold War.',
    'Fall_of_the_Berlin_Wall', { exactDate: true });
  point('9/11', date(2001, 9, 11),
    'Coordinated terrorist attacks in the United States. The date is a familiar landmark in recent world history.',
    'September_11_attacks', { title: 'September 11 attacks', exactDate: true });
  point('Fukushima', date(2011, 3, 11),
    'An earthquake and tsunami triggered the Fukushima nuclear accident in Japan. This marker dates the disaster\'s onset.',
    'Fukushima_nuclear_accident', { exactDate: true });
  point('Paris Agreement', date(2015, 12, 12),
    'Countries adopted the Paris climate agreement. It entered into force in 2016; adoption alone does not mark an immediate change in emissions.',
    'Paris_Agreement', { title: 'Paris Agreement adopted', exactDate: true });
  point('COVID-19', date(2020, 1, 30),
    'WHO declared a global health emergency, which ended in May 2023. This marker dates that declaration, not the first infections or the end of COVID-19.',
    'COVID-19_pandemic', { title: 'COVID-19 global health emergency', exactDate: true });

  event = definitions.map(definition => new TimelineEvent(definition));
  createTimelineEventControls();
}
