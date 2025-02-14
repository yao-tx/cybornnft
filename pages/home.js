import { ethers } from 'ethers';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Web3Modal from 'web3modal';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Image from 'next/image';
import CybornHeader from '/components/CybornHeader';
import CybornFooter from '/components/CybornFooter';
import Head from 'next/head';
import { supabase } from '../client';
import {
  CYBORN_NFT_ADDRESS,
  CYBORN_MARKET_ADDRESS,
  AUCTION_MARKET_ABI,
  AUCTION_MARKET_ADDRESS,
  CYBORN_MARKET_ABI,
  CYBORN_NFT_ABI,
  AUCTION_TOKEN_ABI,
  AUCTION_TOKEN_ADDRESS,
} from '/constants';
import { TelegramShareButton, TelegramIcon } from 'next-share';
import { TwitterShareButton, TwitterIcon } from 'next-share';
import { FaTelegramPlane, FaTwitter, FaWhatsapp } from 'react-icons/fa';
import { WhatsappShareButton, WhatsappButton } from 'next-share';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

function Home() {
  const router = useRouter();
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState('not-loaded');
  useEffect(() => {
    loadNFTs();
  }, []);

  const [nftz, setNftz] = useState([]);
  const [loadingStatez, setLoadingStatez] = useState('not-loaded');
  useEffect(() => {
    loadAuction();
  }, []);

  const MySwal = withReactContent(Swal);
  const open = () => {
    MySwal.fire({
      title: 'You have successfully bought this NFT',
      text: 'Check your inventory & Share it with your audience',
      background: '#04111d',
      icon: 'success',
    });
  };

  const mintOpen = () => {
    MySwal.fire({
      title: 'Do not refresh or close this transaction',
      text: 'Please wait until this transaction approved on-chain',
      background: '#04111d',
      icon: 'success',
      timer: 4500,
    });
  };

  const useCopyToClipboard = (text) => {
    const copyToClipboard = (str) => {
      const el = document.createElement('textarea');
      el.value = str;
      el.setAttribute('readonly', '');
      document.body.appendChild(el);
      const selected =
        document.getSelection().rangeCount > 0
          ? document.getSelection().getRangeAt(0)
          : false;
      el.select();
      const success = document.execCommand('copy');
      document.body.removeChild(el);
      if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
      }
      return success;
    };

    const [copied, setCopied] = React.useState(false);

    const copy = React.useCallback(() => {
      if (!copied) setCopied(copyToClipboard(text));
    }, [text]);
    React.useEffect(() => () => setCopied(false), [text]);

    return [copied, copy];
  };

  const TextCopy = (props) => {
    const [copied, copy] = useCopyToClipboard('');
    return (
      <div>
        <button
          onClick={copy}
          className='bg-white p-4 flex items-center shadow-glow'
        >
          <div className='mr-2' />
          <span>mint.kleoverse.com/nft</span>
        </button>
        <div className='text-white mt-1'>{copied && '💡 Link Copied! '}</div>
      </div>
    );
  };

  const [profile, setProfile] = useState(null);
  useEffect(() => {
    fetchProfile();
  }, []);
  async function fetchProfile() {
    const profileData = await supabase.auth.user();
    if (!profileData) {
      router.push('/signin');
    } else {
      setProfile(profileData);
    }
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.push('/signin');
  }
  if (!profile) return null;

  async function loadNFTs() {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://rinkeby.infura.io/v3/1c632cde3b864975a1d2f123cf5b7ec9'
    );
    const tokenContract = new ethers.Contract(
      CYBORN_NFT_ADDRESS,
      CYBORN_NFT_ABI,
      provider
    );
    const marketContract = new ethers.Contract(
      CYBORN_MARKET_ADDRESS,
      CYBORN_MARKET_ABI,
      provider
    );
    const data = await marketContract.fetchMarketItems();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await tokenContract.tokenURI(i.tokenId);
        const meta = await axios.get(tokenUri);
        let price = ethers.utils.formatUnits(i.price.toString(), 'ether');
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
        };
        return item;
      })
    );
    setNfts(items);
    setLoadingState('loaded');
  }
  async function buyNft(nft) {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(
      CYBORN_MARKET_ADDRESS,
      CYBORN_MARKET_ABI,
      signer
    );

    const price = ethers.utils.parseUnits(nft.price.toString(), 'ether');
    const transaction = await contract.createMarketSale(
      CYBORN_NFT_ADDRESS,
      nft.tokenId,
      {
        value: price,
      }
    );
    mintOpen();
    await transaction.wait();
    open();
    loadNFTs();
  }

  async function loadAuction() {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://rinkeby.infura.io/v3/1c632cde3b864975a1d2f123cf5b7ec9'
    );
    const tokenContract = new ethers.Contract(
      AUCTION_TOKEN_ADDRESS,
      AUCTION_TOKEN_ABI,
      provider
    );
    const marketContract = new ethers.Contract(
      AUCTION_MARKET_ADDRESS,
      AUCTION_MARKET_ABI,
      provider
    );
    const data = await marketContract.fetchMarketItems();

    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await tokenContract.tokenURI(i.tokenId);
        let price = ethers.utils.formatUnits(i.price.toString(), 'ether');
        const meta = await axios.get(tokenUri);
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.data.image,
          name: meta.data.name,
          description: meta.data.description,
        };
        return item;
      })
    );
    setNftz(items);
    setLoadingStatez('loaded');
  }

  if (loadingState === 'loaded' && !nfts.length)
    return (
      <div>
        <h1 className='px-20 py-10 text-3xl'>No items in marketplace</h1>
      </div>
    );
  return (
    <div className=''>
      <div className='flex justify-center'>
        <div className='px-4 container-default'>
          <div
            id='items'
            className='grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-4 gap-4 pt-4'
          >
            {nfts.map((nft, i) => (
              <div key={i} className='card overflow-hidden'>
                <div className='card-image-wrapper px-4 pt-6 pb-1'>
                  <Link
                    href={`https://cybornnft.vercel.app/${nft.seller}/${nft.tokenId}`}
                  >
                    <a>
                      <img src={nft.image} alt={nft.name} title={nft.name} />
                    </a>
                  </Link>
                </div>
                <div className='px-4 card-content'>
                  <div className='grid grid-cols-2'>
                    <div className='card-title'>
                      <Link
                        href={`https://cybornnft.vercel.app/${nft.seller}/${nft.tokenId}`}
                      >
                        <a>
                          <p className='font-bold'>{nft.name}</p>
                        </a>
                      </Link>
                      <p className='font-light text-xs'>{nft.description}</p>
                    </div>
                    <div className='card-share text-right'>
                      <button className='button button-link text-white p-0'>
                        <svg
                          viewBox='0 0 14 4'
                          fill='none'
                          width='16'
                          height='16'
                          xlmns='http://www.w3.org/2000/svg'
                          className='inline-block'
                        >
                          <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M3.5 2C3.5 2.82843 2.82843 3.5 2 3.5C1.17157 3.5 0.5 2.82843 0.5 2C0.5 1.17157 1.17157 0.5 2 0.5C2.82843 0.5 3.5 1.17157 3.5 2ZM8.5 2C8.5 2.82843 7.82843 3.5 7 3.5C6.17157 3.5 5.5 2.82843 5.5 2C5.5 1.17157 6.17157 0.5 7 0.5C7.82843 0.5 8.5 1.17157 8.5 2ZM11.999 3.5C12.8274 3.5 13.499 2.82843 13.499 2C13.499 1.17157 12.8274 0.5 11.999 0.5C11.1706 0.5 10.499 1.17157 10.499 2C10.499 2.82843 11.1706 3.5 11.999 3.5Z'
                            fill='currentColor'
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className='grid grid-flow-col auto-cols-max card-profile my-2'>
                    <div className='card-profile-image mr-3'>
                      <img className='rounded-full' src='./avatar.png' />
                    </div>
                    <div className='card-profile-desc'>
                      <p className='font-bold'>Created b</p>
                      <p>Creator Name</p>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 mb-3 card-price'>
                    <div className='font-bold'>
                      <p>Price</p>
                    </div>
                    <div className='text-right font-light'>
                      <img
                        src='/ethereum.svg'
                        alt='ETH'
                        title='ETH'
                        className='eth-logo inline-block'
                      />{' '}
                      {nft.price} ETH
                    </div>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 items-center '>
                  <div className='bg-blue-300 transition-all rounded-full hover:bg-blue-500  h-14 w-14 group '>
                    <div className=''>
                      <TelegramShareButton
                        url={`https://cybornnft.vercel.app/${nft.seller}/${nft.tokenId}`}
                        title={
                          "Here's my NFT Link, if you are interested you can buy it through this link"
                        }
                      >
                        <FaTelegramPlane className='w-6 h-6 m-4 text-white hover:text-black'></FaTelegramPlane>
                      </TelegramShareButton>
                    </div>
                  </div>

                  <div className='bg-blue-300 rounded-full transition-all hover:bg-blue-500 h-14 w-14 group  '>
                    <div className=''>
                      <TwitterShareButton
                        url={`https://cybornnft.vercel.app/${nft.seller}/${nft.tokenId}`}
                        title={
                          "Here's my NFT Link, if you are interested you can buy it through this link"
                        }
                      >
                        <FaTwitter className='w-6 h-6 m-4 text-white hover:text-black'></FaTwitter>
                      </TwitterShareButton>
                    </div>
                  </div>

                  <div className='bg-blue-300 rounded-full transition-all hover:bg-blue-500 h-14 w-14 group  '>
                    <div className=''>
                      <WhatsappShareButton
                        url={`https://cybornnft.vercel.app/${nft.seller}/${nft.tokenId}`}
                        title={
                          "Here's my NFT Link, if you are interested you can buy it through this link"
                        }
                      >
                        <FaWhatsapp className='w-6 h-6 m-4 text-white hover:text-black'></FaWhatsapp>
                      </WhatsappShareButton>
                    </div>
                  </div>
                </div>
                <div className='card-link'>
                  <button
                    className='button-card py-2'
                    onClick={() => buyNft(nft)}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <br />
      <br />

      <h2 className='text-white p-8 text-center text-6xl gradient-text'>
        Auctions
      </h2>
      <div className='flex justify-center'>
        <div className='px-4 container-default'>
          <div
            id='items'
            className='grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-4 gap-4 pt-4'
          >
            {nftz.map((nfte, i) => (
              <div key={i} className='card overflow-hidden'>
                <div className='card-image-wrapper px-4 pt-6 pb-1'>
                  <Link
                    href={`https://cybornnft.vercel.app/${nfte.seller}/${nfte.tokenId}`}
                  >
                    <a>
                      <img src={nfte.image} alt={nfte.name} title={nfte.name} />
                    </a>
                  </Link>
                </div>
                <div className='px-4 card-content'>
                  <div className='grid grid-cols-2'>
                    <div className='card-title'>
                      <Link
                        href={`https://cybornnft.vercel.app/${nfte.seller}/${nfte.tokenId}`}
                      >
                        <a>
                          <p className='font-bold'>{nfte.name}</p>
                        </a>
                      </Link>
                      <p className='font-light text-xs'>{nfte.description}</p>
                    </div>
                    <div className='card-share text-right'>
                      <button className='button button-link text-white p-0'>
                        <svg
                          viewBox='0 0 14 4'
                          fill='none'
                          width='16'
                          height='16'
                          xlmns='http://www.w3.org/2000/svg'
                          className='inline-block'
                        >
                          <path
                            fillRule='evenodd'
                            clipRule='evenodd'
                            d='M3.5 2C3.5 2.82843 2.82843 3.5 2 3.5C1.17157 3.5 0.5 2.82843 0.5 2C0.5 1.17157 1.17157 0.5 2 0.5C2.82843 0.5 3.5 1.17157 3.5 2ZM8.5 2C8.5 2.82843 7.82843 3.5 7 3.5C6.17157 3.5 5.5 2.82843 5.5 2C5.5 1.17157 6.17157 0.5 7 0.5C7.82843 0.5 8.5 1.17157 8.5 2ZM11.999 3.5C12.8274 3.5 13.499 2.82843 13.499 2C13.499 1.17157 12.8274 0.5 11.999 0.5C11.1706 0.5 10.499 1.17157 10.499 2C10.499 2.82843 11.1706 3.5 11.999 3.5Z'
                            fill='currentColor'
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className='grid grid-flow-col auto-cols-max card-profile my-2'>
                    <div className='card-profile-image mr-3'>
                      <img className='rounded-full' src='./avatar.png' />
                    </div>
                    <div className='card-profile-desc'>
                      <p className='font-bold'>Created by</p>
                      <p>Creator Name</p>
                    </div>
                  </div>
                  <div className='grid grid-cols-2 mb-3 card-price'>
                    <div className='font-bold'>
                      <p>Current Price</p>
                    </div>
                    <div className='text-right font-light'>
                      <img
                        src='/ethereum.svg'
                        alt='ETH'
                        title='ETH'
                        className='eth-logo inline-block'
                      />{' '}
                      {nfte.price} ETH
                    </div>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2 items-center '>
                  <div className='bg-blue-300 transition-all rounded-full hover:bg-blue-500  h-14 w-14 group '>
                    <div className=''>
                      <TelegramShareButton
                        url={`https://cybornnft.vercel.app/${nfte.seller}/${nfte.tokenId}`}
                        title={
                          "Here's my NFT Link, if you are interested you can buy it through this link"
                        }
                      >
                        <FaTelegramPlane className='w-6 h-6 m-4 text-white hover:text-black'></FaTelegramPlane>
                      </TelegramShareButton>
                    </div>
                  </div>

                  <div className='bg-blue-300 rounded-full transition-all hover:bg-blue-500 h-14 w-14 group  '>
                    <div className=''>
                      <TwitterShareButton
                        url={`https://cybornnft.vercel.app/${nfte.seller}/${nfte.tokenId}`}
                        title={
                          "Here's my NFT Link, if you are interested you can buy it through this link"
                        }
                      >
                        <FaTwitter className='w-6 h-6 m-4 text-white hover:text-black'></FaTwitter>
                      </TwitterShareButton>
                    </div>
                  </div>

                  <div className='bg-blue-300 rounded-full transition-all hover:bg-blue-500 h-14 w-14 group  '>
                    <div className=''>
                      <WhatsappShareButton
                        url={`https://cybornnft.vercel.app/${nfte.seller}/${nfte.tokenId}`}
                        title={
                          "Here's my NFT Link, if you are interested you can buy it through this link"
                        }
                      >
                        <FaWhatsapp className='w-6 h-6 m-4 text-white hover:text-black'></FaWhatsapp>
                      </WhatsappShareButton>
                    </div>
                  </div>
                </div>
                <div className='card-link'>
                  <button
                    className='button-card py-2'
                    onClick={() => buyNft(nft)}
                  >
                    Bid Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div>
        {showTransferModal ? (
          <>
            <div className='justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none'>
              <div className='relative w-auto my-6 mx-auto max-w-3xl'>
                <div className='border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-cybornheader outline-none focus:outline-none'>
                  <div className='flex items-start justify-between p-5 border-b border-solid border-slate-200 rounded-t'>
                    <h3 className='text-3xl font-semibold text-white'>
                      Place Your Bid
                    </h3>
                    <button
                      className='p-1 ml-auto bg-transparent border-0 text-white opacity-5 float-right text-3xl leading-none font-semibold outline-none focus:outline-none'
                      onClick={() => setShowTransferModal(false)}
                    >
                      <span className='bg-black text-white h-6 w-6 text-3xl block'>
                        ×
                      </span>
                    </button>
                  </div>

                  <div className='relative p-6 flex-auto'>
                    <input
                      placeholder='Enter Your Bid Price'
                      className='mt-8 border rounded p-4 block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer'
                    />
                    <br />
                    <button className='block w-full px-12 py-3 text-sm font-medium text-black rounded shadow bg-blue-400 sm:w-auto active:bg-lime-100 hover:bg-lime-300 focus:outline-none focus:ring'>
                      Submit
                    </button>
                  </div>

                  <div className='flex items-center justify-end p-6 border-t border-solid border-slate-200 rounded-b'>
                    <button
                      className='text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150'
                      type='button'
                      onClick={() => setShowTransferModal(false)}
                    >
                      Close
                    </button>
                    <button
                      className='bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150'
                      type='button'
                      onClick={() => setShowTransferModal(false)}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className='opacity-25 fixed inset-0 z-40 bg-black'></div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const mapDipatchToProps = (dispatch) => {
  return {
    getMarketPlaceNFT: (params) => dispatch(actions.getMarketPlaceNFT(params)),
    getMoreMarketPlaceNFT: (params) =>
      dispatch(actions.getMoreMarketPlaceNFT(params)),
    getCategories: () => dispatch(actions.fetchCategories()),
    clearMarketPlaceNFT: () =>
      dispatch({ type: 'FETCHED_MARKETPLACE', data: [] }),
    clearPagination: () => dispatch({ type: 'FETCHED_PAGINATION', data: [] }),
    clearMoreMarketPlaceNFT: () =>
      dispatch({ type: 'FETCHED_MORE_MARKETPLACE', data: [] }),
  };
};
const mapStateToProps = (state) => {
  return {
    NFTs: state.fetchMarketPlaceNFT,
    pagination: state.fetchPagination,
    moreNFTs: state.fetchMoreMarketPlaceNFT,
    categories: state.fetchCategory,
  };
};

export default connect(mapStateToProps, mapDipatchToProps)(Home);
