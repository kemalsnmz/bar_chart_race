export const sampleData = `Company,Revenue,Year
Apple,156,2012
Samsung,188,2012
Microsoft,74,2012
IBM,104,2012
Google,50,2012
Amazon,61,2012
Intel,54,2012
Cisco,46,2012
Oracle,37,2012
Meta,5,2012
NVIDIA,4,2012
Netflix,3,2012
Apple,170,2013
Samsung,213,2013
Microsoft,78,2013
IBM,100,2013
Google,56,2013
Amazon,74,2013
Intel,53,2013
Cisco,49,2013
Oracle,38,2013
Meta,8,2013
NVIDIA,4,2013
Netflix,4,2013
Apple,183,2014
Samsung,196,2014
Microsoft,87,2014
IBM,93,2014
Google,66,2014
Amazon,89,2014
Intel,56,2014
Cisco,47,2014
Oracle,38,2014
Meta,12,2014
NVIDIA,4,2014
Netflix,5,2014
Apple,234,2015
Samsung,177,2015
Microsoft,93,2015
IBM,82,2015
Google,75,2015
Amazon,107,2015
Intel,55,2015
Cisco,49,2015
Oracle,38,2015
Meta,18,2015
NVIDIA,5,2015
Netflix,7,2015
Apple,216,2016
Samsung,174,2016
Microsoft,85,2016
IBM,80,2016
Google,90,2016
Amazon,136,2016
Intel,59,2016
Cisco,49,2016
Oracle,37,2016
Meta,28,2016
NVIDIA,7,2016
Netflix,9,2016
Apple,229,2017
Samsung,211,2017
Microsoft,90,2017
IBM,79,2017
Google,111,2017
Amazon,178,2017
Intel,63,2017
Cisco,48,2017
Oracle,37,2017
Meta,40,2017
NVIDIA,10,2017
Netflix,11,2017
Apple,266,2018
Samsung,221,2018
Microsoft,110,2018
IBM,79,2018
Google,137,2018
Amazon,233,2018
Intel,71,2018
Cisco,49,2018
Oracle,40,2018
Meta,56,2018
NVIDIA,12,2018
Netflix,16,2018
Apple,260,2019
Samsung,197,2019
Microsoft,126,2019
IBM,77,2019
Google,162,2019
Amazon,281,2019
Intel,72,2019
Cisco,52,2019
Oracle,39,2019
Meta,71,2019
NVIDIA,12,2019
Netflix,20,2019
Apple,274,2020
Samsung,197,2020
Microsoft,143,2020
IBM,74,2020
Google,183,2020
Amazon,386,2020
Intel,78,2020
Cisco,49,2020
Oracle,40,2020
Meta,86,2020
NVIDIA,17,2020
Netflix,25,2020
Apple,365,2021
Samsung,236,2021
Microsoft,168,2021
IBM,74,2021
Google,258,2021
Amazon,470,2021
Intel,79,2021
Cisco,50,2021
Oracle,40,2021
Meta,118,2021
NVIDIA,17,2021
Netflix,30,2021
Apple,394,2022
Samsung,244,2022
Microsoft,198,2022
IBM,60,2022
Google,283,2022
Amazon,514,2022
Intel,63,2022
Cisco,52,2022
Oracle,42,2022
Meta,117,2022
NVIDIA,27,2022
Netflix,32,2022
Apple,383,2023
Samsung,224,2023
Microsoft,212,2023
IBM,62,2023
Google,307,2023
Amazon,575,2023
Intel,54,2023
Cisco,57,2023
Oracle,50,2023
Meta,135,2023
NVIDIA,61,2023
Netflix,33,2023`;

// Line Chart Race — transposed format (date rows, entity columns)
export const sampleLineData = `date,Apple,Amazon,Microsoft,Google,Meta,NVIDIA,Netflix
image,https://cdn.simpleicons.org/apple,https://cdn.simpleicons.org/amazon,https://cdn.simpleicons.org/microsoft,https://cdn.simpleicons.org/google,https://cdn.simpleicons.org/meta,https://cdn.simpleicons.org/nvidia,https://cdn.simpleicons.org/netflix
2012,156,61,74,50,5,4,3
2013,170,74,78,56,8,4,4
2014,183,89,87,66,12,4,5
2015,234,107,93,75,18,5,7
2016,216,136,85,90,28,7,9
2017,229,178,90,111,40,10,11
2018,266,233,110,137,56,12,16
2019,260,281,126,162,71,12,20
2020,274,386,143,183,86,17,25
2021,365,470,168,258,118,17,30
2022,394,514,198,283,117,27,32
2023,383,575,212,307,135,61,33`;

export const sampleLineMeta = {
  title: 'Tech Giants Annual Revenue',
  unit: 'B$',
};

export const sampleMeta = {
  title: 'Tech Giants Annual Revenue',
  unit: 'B$',
};

export const sampleImages: Record<string, string> = {
  Apple:     'https://cdn.simpleicons.org/apple',
  Samsung:   'https://cdn.simpleicons.org/samsung',
  Microsoft: 'https://cdn.simpleicons.org/microsoft',
  IBM:       'https://cdn.simpleicons.org/ibm',
  Google:    'https://cdn.simpleicons.org/google',
  Amazon:    'https://cdn.simpleicons.org/amazon',
  Intel:     'https://cdn.simpleicons.org/intel',
  Cisco:     'https://cdn.simpleicons.org/cisco',
  Oracle:    'https://cdn.simpleicons.org/oracle',
  Meta:      'https://cdn.simpleicons.org/meta',
  NVIDIA:    'https://cdn.simpleicons.org/nvidia',
  Netflix:   'https://cdn.simpleicons.org/netflix',
};
