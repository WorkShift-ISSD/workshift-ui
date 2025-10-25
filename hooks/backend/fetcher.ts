import axios, { AxiosResponse } from "axios"

export default async (url: string) => {
 
    const token = localStorage.getItem('access_token')

    return axios({
        method: 'GET',
        url: url.startsWith('https://') ? url : `${process.env.NEXT_PUBLIC_API_URL}${url}`,
        headers: {
            // Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        timeout: 200000
    })
    .then((res: AxiosResponse) => {
        // If the response is OK, return the data
        // If not, return the entire response object, otherwise SWR doesn't recognise that it's an error
        if (res.status === 200) {
            return res.data
        }
        return res
    })
}
  